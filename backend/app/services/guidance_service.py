"""
ScanWise — Guidance service.

Computes consumption guidance (servings per day, days per week) from
the product's nutrition data and the age_group_limits table.
"""
from ..db import get_db


def compute_guidance(product_id: int, age_group_code: str) -> dict | None:
    """Compute consumption guidance based on nutrition and daily limits.

    Returns:
        dict with max_servings_per_day, days_per_week, guidance_basis, limiting_nutrient
        or None if no guidance can be computed.
    """
    db = get_db()

    rows = db.execute(
        """SELECT n.code AS nutrient_code, pn.amount_per_serving, agl.daily_limit
           FROM product_nutrition pn
           JOIN nutrients n ON n.nutrient_id = pn.nutrient_id
           JOIN age_groups ag ON ag.code = ?
           JOIN age_group_limits agl ON agl.nutrient_id = pn.nutrient_id
                                    AND agl.age_group_id = ag.age_group_id
           WHERE pn.product_id = ? AND pn.amount_per_serving > 0
           ORDER BY agl.daily_limit / pn.amount_per_serving ASC
           LIMIT 1""",
        (age_group_code, product_id),
    ).fetchone()

    if not rows:
        return None

    raw = rows["daily_limit"] / rows["amount_per_serving"]
    max_servings = int(raw * 2) / 2.0  # round down to nearest 0.5

    # Simple days_per_week: 7 if safe amounts, fewer if limited
    if max_servings >= 3:
        days = 7
    elif max_servings >= 1:
        days = 5
    else:
        days = 3

    return {
        "max_servings_per_day": max_servings,
        "days_per_week": days,
        "guidance_basis": "rule",
        "limiting_nutrient": rows["nutrient_code"],
    }
