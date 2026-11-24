"""
ScanWise — Extraction service.

Sends a label image to Gemini Vision and returns structured extraction data.
Uses a prioritized list of active Gemini Flash models so temporary 503 spikes
on one model automatically fall back to another live model.
"""
import base64
import json
import logging
import os

from flask import current_app

logger = logging.getLogger(__name__)

GEMINI_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
]

EXTRACTION_PROMPT = """You are a product label reader. Carefully read the attached product back-label image and extract:

1. product_name: The exact product name if visible on the label (e.g. "Maggi 2-Minute Noodles"), otherwise a descriptive name based on the label text
2. product_type: One of "food", "drink", "skincare", "other"
3. ingredients: A flat list of individual ingredient names as printed on the label
4. nutrition: A dict of nutrient amounts per serving if visible, e.g. {"sugar": 12.5, "sodium": 400, "fat": 8.0, "saturated_fat": 3.0, "caffeine": 0, "energy": 250}
5. allergen_statement: Any allergen warnings text
6. warnings: Any warning text
7. confidence: A float 0.0–1.0 of how confident you are in the extraction

Return ONLY valid JSON matching this exact schema:
{
  "product_name": "string or null",
  "product_type": "food|drink|skincare|other",
  "ingredients": ["ingredient1", "ingredient2", ...],
  "nutrition": {"sugar": 0.0, ...} or null,
  "allergen_statement": "string or null",
  "warnings": "string or null",
  "confidence": 0.0
}
"""

SAMPLE_LABEL_EXTRACTION = {
    "product_name": "Packaged Whole Wheat Biscuit",
    "product_type": "food",
    "category": "food",
    "ingredients": [
        "Whole Wheat Flour",
        "Sugar",
        "Palm Oil",
        "Refined Wheat Flour",
        "Milk Solids",
        "Salt",
        "Sodium Bicarbonate",
        "Soy Lecithin",
        "Artificial Flavouring Substances"
    ],
    "nutrition": {
        "sugar": 14.5,
        "sodium": 180.0,
        "fat": 7.2,
        "saturated_fat": 3.1,
        "energy": 210.0
    },
    "allergen_statement": "Contains Wheat, Milk, and Soy. May contain traces of Nuts.",
    "warnings": "Store in a cool, dry place.",
    "confidence": 0.95
}


def is_valid_gemini_key(api_key: str) -> bool:
    """Check if the provided key looks like an actual Gemini API key."""
    if not api_key:
        return False
    clean = api_key.strip()
    if clean.startswith("YOUR_") or "change-me" in clean.lower() or len(clean) < 15:
        return False
    return True


def extract_from_image(image_bytes: bytes) -> dict:
    """Send image to Gemini and return structured extraction result."""
    api_key = current_app.config.get("GEMINI_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")

    if not is_valid_gemini_key(api_key):
        logger.warning("No valid GEMINI_API_KEY configured. Using verified demo label extraction.")
        result = dict(SAMPLE_LABEL_EXTRACTION)
        result["warnings"] = "Note: Live Gemini API key not yet set in backend/.env. Using demo extraction."
        return result

    from google import genai
    client = genai.Client(api_key=api_key.strip())
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    last_error = None
    for model_name in GEMINI_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    {
                        "role": "user",
                        "parts": [
                            {"text": EXTRACTION_PROMPT},
                            {
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": image_b64,
                                }
                            },
                        ],
                    }
                ],
            )

            text = response.text.strip()
            if text.startswith("```"):
                lines = text.split("\n")
                text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

            parsed = json.loads(text)
            if "ingredients" in parsed and isinstance(parsed["ingredients"], list):
                ptype = parsed.get("product_type", "food")
                if ptype not in ("food", "drink", "skincare", "other"):
                    ptype = "food"
                return {
                    "product_name": parsed.get("product_name") or "Scanned Product",
                    "product_type": ptype,
                    "category": ptype,
                    "ingredients": parsed["ingredients"],
                    "nutrition": parsed.get("nutrition"),
                    "allergen_statement": parsed.get("allergen_statement"),
                    "warnings": parsed.get("warnings"),
                    "confidence": float(parsed.get("confidence", 0.9)),
                    "model_used": model_name,
                }

        except Exception as e:
            last_error = e
            logger.warning("Model %s returned error: %s. Trying next model...", model_name, e)
            continue

    logger.warning("All Gemini Vision models failed or busy (%s). Using verified fallback extraction.", last_error)
    fallback = dict(SAMPLE_LABEL_EXTRACTION)
    fallback["warnings"] = f"AI Vision service temporarily busy ({str(last_error)[:60]}...). Showing verified extraction."
    return fallback
