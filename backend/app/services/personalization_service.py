"""
ScanWise — Personalization service.

Deterministic rules that adjust ingredient ratings based on the user's
age group, health conditions, and allergens.
"""
from ..repositories import ingredient_repo


def personalize_ingredient(ingredient: dict, age_group_code: str,
                           user_conditions: list[str],
                           user_allergens: list[str]) -> dict:
    """Return a personalised copy of the ingredient with adjusted rating.

    Args:
        ingredient: dict with at least ingredient_id, base_rating_code, base_severity
        age_group_code: e.g. 'child', 'teen', 'adult', 'old_age'
        user_conditions: list of condition codes e.g. ['diabetes', 'hypertension']
        user_allergens: list of allergen codes e.g. ['peanut', 'milk']

    Returns:
        dict with 'personalised_rating', 'personalised_severity', 'reason'
    """
    from ..db import get_db
    db = get_db()

    ing_id = ingredient["ingredient_id"]
    base_severity = ingredient.get("base_severity", 1)
    reasons = []

    final_severity = base_severity

    # 1. Age-group override
    ag_row = db.execute("SELECT age_group_id FROM age_groups WHERE code = ?", (age_group_code,)).fetchone()
    if ag_row:
        age_rating = ingredient_repo.get_age_rating(ing_id, ag_row["age_group_id"])
        if age_rating and age_rating["severity"] > final_severity:
            final_severity = age_rating["severity"]
            reasons.append(f"Higher risk for {age_group_code} age group")

    # 2. Condition risks
    if user_conditions:
        condition_risks = ingredient_repo.get_condition_risks(ing_id)
        for cr in condition_risks:
            if cr["condition_code"] in user_conditions and cr["severity"] > final_severity:
                final_severity = cr["severity"]
                reasons.append(f"Risk with {cr['condition_code']}")

    # 3. Allergen match → always risk (severity 3)
    if user_allergens:
        allergen_links = ingredient_repo.get_allergen_links(ing_id)
        for al in allergen_links:
            if al["code"] in user_allergens and 3 > final_severity:
                final_severity = 3
                reasons.append(f"Allergen match: {al['name']}")

    # Map severity back to code
    rating_row = db.execute(
        "SELECT code FROM ratings WHERE severity = ?", (final_severity,)
    ).fetchone()
    rating_code = rating_row["code"] if rating_row else "adjustable"

    return {
        **ingredient,
        "personalised_rating": rating_code,
        "personalised_severity": final_severity,
        "reason": "; ".join(reasons) if reasons else None,
    }


def compute_verdict(personalised_ingredients: list[dict]) -> tuple[str, int]:
    """Compute the overall verdict and score from personalised ingredients.

    Returns:
        (verdict, overall_score)  where verdict is 'good', 'okay', or 'avoid'
    """
    if not personalised_ingredients:
        return "okay", 50

    total = len(personalised_ingredients)
    risk_count = sum(1 for i in personalised_ingredients if i.get("personalised_rating") == "risk")
    adjustable_count = sum(1 for i in personalised_ingredients if i.get("personalised_rating") == "adjustable")
    safe_count = total - risk_count - adjustable_count

    # Score: 100 if all safe, lose points for adjustable and risk
    score = max(0, min(100, int(
        (safe_count * 100 + adjustable_count * 50 + risk_count * 0) / total
    )))

    # Verdict
    risk_ratio = risk_count / total if total > 0 else 0
    if risk_ratio > 0.35 or risk_count >= 3:
        verdict = "avoid"
    elif risk_count > 0 or (adjustable_count / total) >= 0.4:
        verdict = "okay"
    else:
        verdict = "good"

    return verdict, score
