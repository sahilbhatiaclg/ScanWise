"""
ScanWise — Report service.

Orchestrates saving a full report (product + ingredients + report + items)
in a single SQLite transaction.
"""
from ..db import get_db
from ..repositories import product_repo, report_repo, log_repo
from ..utils.hashing import product_hash as compute_product_hash


def save_report(user_id: int, product_name: str, product_type: str,
                personalised_ingredients: list[dict],
                verdict: str, overall_score: int,
                age_group_code: str,
                user_description: str | None = None,
                max_servings_per_day: float | None = None,
                days_per_week: int | None = None,
                guidance_basis: str | None = None) -> dict:
    """Save a complete report in one transaction.

    Returns the report dict with public_id.
    """
    db = get_db()

    # Deduplicate by ingredient_id so SQLite UNIQUE constraints never fail
    unique_ingredients = []
    seen_ids = set()
    for ing in personalised_ingredients:
        iid = ing.get("ingredient_id")
        if iid is not None and iid not in seen_ids:
            seen_ids.add(iid)
            unique_ingredients.append(ing)

    # Compute product hash from normalised names + type
    norm_names = [i["normalized_name"] for i in unique_ingredients if i.get("normalized_name")]
    phash = compute_product_hash(norm_names, product_type)

    try:
        # 1. Find or create product
        existing = product_repo.find_by_hash(phash)
        if existing:
            pid = existing["product_id"]
        else:
            pid = product_repo.create_product(phash, product_type, label_name=product_name)
            # Add product-ingredient links
            for idx, ing in enumerate(unique_ingredients, start=1):
                product_repo.add_product_ingredient(pid, ing["ingredient_id"], idx)

        # 2. Create report
        report = report_repo.create_report(
            user_id=user_id,
            product_id=pid,
            age_group_code=age_group_code,
            user_product_name=product_name,
            verdict=verdict,
            overall_score=overall_score,
            user_description=user_description,
            max_servings_per_day=max_servings_per_day,
            days_per_week=days_per_week,
            guidance_basis=guidance_basis,
        )

        # 3. Add report items
        for ing in unique_ingredients:
            report_repo.add_report_item(
                report_id=report["report_id"],
                ingredient_id=ing["ingredient_id"],
                rating_code=ing["personalised_rating"],
                reason=ing.get("reason"),
            )

        # 4. Audit log
        log_repo.log_action(user_id, "REPORT_CREATED", "report", report["report_id"])

        return report

    except Exception:
        raise
