"""
ScanWise — Ingredient service.

Resolves ingredient names against the SQLite database.
Unknown ingredients are deduplicated, batched, and sent to Gemini for analysis.
"""
import json
import logging

from flask import current_app

from ..repositories import ingredient_repo
from ..utils.normalize import normalize_ingredient

logger = logging.getLogger(__name__)

VALID_CATEGORIES = {
    "sweetener", "preservative", "colour", "flavour", "emulsifier",
    "antioxidant", "acidity_regulator", "thickener", "fat_oil", "protein",
    "vitamin_mineral", "salt", "active", "surfactant", "humectant",
    "emollient", "fragrance", "sunscreen_filter", "other",
}
VALID_RATINGS = {"safe", "adjustable", "risk"}

# Single fast model with tight timeout so /analyze never hits Vercel's serverless timeout
FAST_ANALYZE_MODELS = [
    "gemini-3.5-flash",
]


def resolve_ingredients(raw_names: list[str]) -> tuple[list[dict], list[str]]:
    """Resolve a list of raw ingredient names, deduplicating by normalized name.

    Returns:
        (known_ingredients, unknown_names)
    """
    known = []
    unknown = []
    seen_known_ids = set()
    seen_unknown_norms = set()

    for raw in raw_names:
        normalized = normalize_ingredient(raw)
        if not normalized:
            continue

        ing = ingredient_repo.resolve_ingredient(normalized)
        if ing:
            if ing["ingredient_id"] not in seen_known_ids:
                seen_known_ids.add(ing["ingredient_id"])
                known.append({**ing, "original_name": raw, "normalized_name": normalized})
        else:
            if normalized not in seen_unknown_norms:
                seen_unknown_norms.add(normalized)
                unknown.append(raw)

    return known, unknown


INGREDIENT_ANALYSIS_PROMPT = """Analyze these food/skincare ingredients and return a JSON array.
For each ingredient, provide:
- name: the exact ingredient name from the input list
- category: MUST be one of: sweetener, preservative, colour, flavour, emulsifier, antioxidant, acidity_regulator, thickener, fat_oil, protein, vitamin_mineral, salt, active, surfactant, humectant, emollient, fragrance, sunscreen_filter, other
- base_rating: MUST be one of: safe, adjustable, risk
- uses: a short description of what it does (1 sentence)
- disadvantages: potential issues or side effects (1 sentence, or null if none)

Ingredients to analyze: {ingredients}

Return ONLY a valid JSON array:
[
  {{"name": "...", "category": "...", "base_rating": "...", "uses": "...", "disadvantages": "..."}}
]
"""


def analyze_unknown_ingredients(unknown_names: list[str]) -> list[dict]:
    """Send unknown ingredients to Gemini for analysis and save them.

    Returns a list of resolved ingredient dicts.
    """
    if not unknown_names:
        return []

    api_key = current_app.config.get("GEMINI_API_KEY", "")
    if not api_key or api_key.startswith("YOUR_") or len(api_key) < 15:
        logger.warning("No valid GEMINI_API_KEY; returning unknown ingredients as 'other/adjustable'")
        return _fallback_ingredients(unknown_names)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(
            api_key=api_key.strip(),
            http_options=types.HttpOptions(timeout=12000),  # 12s timeout (Google minimum is 10s)
        )

        prompt = INGREDIENT_ANALYSIS_PROMPT.format(ingredients=", ".join(unknown_names))
        response = None
        for model_name in FAST_ANALYZE_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                break
            except Exception as model_err:
                logger.warning("Ingredient model %s failed: %s", model_name, model_err)
                continue

        if response is None:
            raise RuntimeError("All fast Gemini models failed for ingredient analysis")

        text = response.text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        ai_results = json.loads(text)
        saved = []
        seen_ids = set()

        for item in ai_results:
            name = (item.get("name") or "").strip()
            normalized = normalize_ingredient(name)
            if not normalized:
                continue

            existing = ingredient_repo.resolve_ingredient(normalized)
            if existing:
                if existing["ingredient_id"] not in seen_ids:
                    seen_ids.add(existing["ingredient_id"])
                    saved.append(existing)
                continue

            cat = (item.get("category") or "other").strip().lower()
            if cat not in VALID_CATEGORIES:
                cat = "other"

            rating = (item.get("base_rating") or "adjustable").strip().lower()
            if rating not in VALID_RATINGS:
                rating = "adjustable"

            try:
                ingredient_repo.insert_ingredient(
                    name=name,
                    normalized_name=normalized,
                    category_code=cat,
                    base_rating_code=rating,
                    uses=item.get("uses"),
                    disadvantages=item.get("disadvantages"),
                    source="ai",
                )
                ing = ingredient_repo.resolve_ingredient(normalized)
                if ing and ing["ingredient_id"] not in seen_ids:
                    seen_ids.add(ing["ingredient_id"])
                    saved.append(ing)
            except Exception as e:
                logger.warning("Failed to save AI ingredient '%s': %s", name, e)

        # Ensure any unknown_names not returned by Gemini still get fallback entries
        returned_norms = {s["normalized_name"] for s in saved}
        missing = [u for u in unknown_names if normalize_ingredient(u) not in returned_norms]
        if missing:
            saved.extend(_fallback_ingredients(missing))

        return saved

    except Exception as e:
        logger.error("AI ingredient analysis failed: %s", e)
        return _fallback_ingredients(unknown_names)


def _fallback_ingredients(names: list[str]) -> list[dict]:
    """Create minimal fallback entries for ingredients when AI is unavailable."""
    results = []
    seen_ids = set()
    for name in names:
        normalized = normalize_ingredient(name)
        if not normalized:
            continue
        existing = ingredient_repo.resolve_ingredient(normalized)
        if existing:
            if existing["ingredient_id"] not in seen_ids:
                seen_ids.add(existing["ingredient_id"])
                results.append(existing)
            continue
        try:
            ingredient_repo.insert_ingredient(
                name=name,
                normalized_name=normalized,
                category_code="other",
                base_rating_code="adjustable",
                uses="Common food or formulation ingredient.",
                disadvantages=None,
                source="ai",
            )
            ing = ingredient_repo.resolve_ingredient(normalized)
            if ing and ing["ingredient_id"] not in seen_ids:
                seen_ids.add(ing["ingredient_id"])
                results.append(ing)
        except Exception as e:
            logger.warning("Fallback insert failed for '%s': %s", name, e)
    return results
