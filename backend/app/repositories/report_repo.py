"""
ScanWise — Report repository (SQLite).
"""
from ..db import get_db


def create_report(user_id: int, product_id: int, age_group_code: str,
                  user_product_name: str, verdict: str, overall_score: int,
                  user_description: str | None = None,
                  max_servings_per_day: float | None = None,
                  days_per_week: int | None = None,
                  guidance_basis: str | None = None) -> dict:
    """Create a report and return {report_id, public_id}."""
    db = get_db()
    ag = db.execute("SELECT age_group_id FROM age_groups WHERE code = ?", (age_group_code,)).fetchone()
    if not ag:
        raise ValueError(f"Unknown age group: {age_group_code}")

    db.execute(
        """INSERT INTO reports
           (user_id, product_id, age_group_id, user_product_name, user_description,
            verdict, overall_score, max_servings_per_day, days_per_week, guidance_basis)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, product_id, ag["age_group_id"], user_product_name, user_description,
         verdict, overall_score, max_servings_per_day, days_per_week, guidance_basis),
    )
    report_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
    public_id = db.execute("SELECT public_id FROM reports WHERE report_id = ?", (report_id,)).fetchone()["public_id"]
    db.commit()
    return {"report_id": report_id, "public_id": public_id}


def add_report_item(report_id: int, ingredient_id: int, rating_code: str, reason: str | None = None):
    db = get_db()
    rat = db.execute("SELECT rating_id FROM ratings WHERE code = ?", (rating_code,)).fetchone()
    if not rat:
        raise ValueError(f"Unknown rating: {rating_code}")
    db.execute(
        "INSERT OR IGNORE INTO report_items (report_id, ingredient_id, rating_id, reason) VALUES (?, ?, ?, ?)",
        (report_id, ingredient_id, rat["rating_id"], reason),
    )
    db.commit()


def get_user_reports(user_id: int, page: int = 1, page_size: int = 10) -> list[dict]:
    db = get_db()
    offset = (page - 1) * page_size
    rows = db.execute(
        """SELECT r.public_id, r.user_product_name, r.verdict, r.overall_score, r.created_at
           FROM reports r
           WHERE r.user_id = ?
           ORDER BY r.created_at DESC
           LIMIT ? OFFSET ?""",
        (user_id, page_size, offset),
    ).fetchall()
    return [dict(r) for r in rows]


def get_report_by_public_id(public_id: str, user_id: int) -> dict | None:
    db = get_db()
    report = db.execute(
        """SELECT r.report_id, r.public_id, r.user_product_name, r.user_description,
                  r.verdict, r.overall_score, r.max_servings_per_day, r.days_per_week,
                  r.guidance_basis, r.created_at,
                  ag.code AS age_group, p.label_name, pt.code AS product_type
           FROM reports r
           JOIN age_groups ag ON ag.age_group_id = r.age_group_id
           JOIN products p ON p.product_id = r.product_id
           JOIN product_types pt ON pt.product_type_id = p.product_type_id
           WHERE r.public_id = ? AND r.user_id = ?""",
        (public_id, user_id),
    ).fetchone()
    if not report:
        return None
    result = dict(report)

    # Items
    items = db.execute(
        """SELECT i.name AS ingredient, ic.name AS category,
                  rt.code AS rating, ri.reason, pi.position
           FROM report_items ri
           JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
           JOIN ingredient_categories ic ON ic.category_id = i.category_id
           JOIN ratings rt ON rt.rating_id = ri.rating_id
           LEFT JOIN product_ingredients pi
                ON pi.product_id = (SELECT product_id FROM reports WHERE report_id = ri.report_id)
               AND pi.ingredient_id = ri.ingredient_id
           WHERE ri.report_id = ?
           ORDER BY pi.position""",
        (result["report_id"],),
    ).fetchall()
    result["items"] = [dict(it) for it in items]
    return result


def delete_report(public_id: str, user_id: int) -> bool:
    db = get_db()
    cursor = db.execute(
        "DELETE FROM reports WHERE public_id = ? AND user_id = ?",
        (public_id, user_id),
    )
    db.commit()
    return cursor.rowcount > 0


def get_pie_chart_data(report_id: int) -> dict:
    db = get_db()

    # Rating share
    rating_rows = db.execute(
        """SELECT rt.code AS rating, COUNT(*) AS count
           FROM report_items ri
           JOIN ratings rt ON rt.rating_id = ri.rating_id
           WHERE ri.report_id = ?
           GROUP BY rt.code""",
        (report_id,),
    ).fetchall()

    # Category share
    category_rows = db.execute(
        """SELECT ic.name AS category, COUNT(*) AS count
           FROM report_items ri
           JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
           JOIN ingredient_categories ic ON ic.category_id = i.category_id
           WHERE ri.report_id = ?
           GROUP BY ic.name
           ORDER BY count DESC""",
        (report_id,),
    ).fetchall()

    return {
        "by_rating": [dict(r) for r in rating_rows],
        "by_category": [dict(r) for r in category_rows],
    }
