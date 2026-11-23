"""
ScanWise — Ingredient service.

Resolves ingredient names against the SQLite database.
Unknown ingredients are batched and sent to Gemini for analysis.
"""
import json
import logging

from flask import current_app

from ..repositories import ingredient_repo
from ..utils.normalize import normalize_ingredient

logger = logging.getLogger(__name__)


def resolve_ingredients(raw_names: list[str]) -> tuple[list[dict], list[str]]:
    """Resolve a list of raw ingredient names.

    Returns:
        (known_ingredients, unknown_names)
    """
    known = []
    unknown = []

    for raw in raw_names:
        normalized = normalize_ingredient(raw)
        if not normalized:
            continue

        ing = ingredient_repo.resolve_ingredient(normalized)
        if ing:
            known.append({**ing, "original_name": raw, "normalized_name": normalized})
        else:
            unknown.append(raw)

    return known, unknown


INGREDIENT_ANALYSIS_PROMPT = """Analyze these food/skincare ingredients and return a JSON array.
For each ingredient, provide:
- name: the ingredient name
- category: one of: sweetener, preservative, colour, flavour, emulsifier, antioxidant, acidity_regulator, thickener, fat_oil, protein, vitamin_mineral, salt, active, surfactant, humectant, emollient, fragrance, sunscreen_filter, other
- base_rating: one of: safe, adjustable, risk
- uses: a short description of what it does and its benefits (1-2 sentences)
- disadvantages: potential issues or side effects (1-2 sentences)

Ingredients to analyze: {ingredients}

Return ONLY a valid JSON array like:
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

        client = genai.Client(api_key=api_key)

        prompt = INGREDIENT_ANALYSIS_PROMPT.format(ingredients=", ".join(unknown_names))
        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt,
        )

        text = response.text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        ai_results = json.loads(text)
        saved = []

        for item in ai_results:
            name = item.get("name", "")
            normalized = normalize_ingredient(name)
            if not normalized:
                continue

            # Check if it was already added (race condition guard)
            existing = ingredient_repo.resolve_ingredient(normalized)
            if existing:
                saved.append(existing)
                continue

            try:
                ing_id = ingredient_repo.insert_ingredient(
                    name=name,
                    normalized_name=normalized,
                    category_code=item.get("category", "other"),
                    base_rating_code=item.get("base_rating", "adjustable"),
                    uses=item.get("uses"),
                    disadvantages=item.get("disadvantages"),
                    source="ai",
                )
                # Re-read to get full details
                ing = ingredient_repo.resolve_ingredient(normalized)
                if ing:
                    saved.append(ing)
            except Exception as e:
                logger.warning("Failed to save AI ingredient '%s': %s", name, e)

        return saved

    except Exception as e:
        logger.error("AI ingredient analysis failed: %s", e)
        return _fallback_ingredients(unknown_names)


def _fallback_ingredients(names: list[str]) -> list[dict]:
    """Create minimal fallback entries for ingredients when AI is unavailable."""
    results = []
    for name in names:
        normalized = normalize_ingredient(name)
        try:
            ing_id = ingredient_repo.insert_ingredient(
                name=name,
                normalized_name=normalized,
                category_code="other",
                base_rating_code="adjustable",
                uses=None,
                disadvantages=None,
                source="ai",
            )
            ing = ingredient_repo.resolve_ingredient(normalized)
            if ing:
                results.append(ing)
        except Exception:
            pass
    return results
