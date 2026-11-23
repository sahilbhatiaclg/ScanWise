"""
ScanWise — Ingredient repository (SQLite).
"""
from ..db import get_db


def find_by_normalized_name(name: str) -> dict | None:
    """Look up an ingredient by its normalized name."""
    db = get_db()
    row = db.execute(
        """SELECT i.ingredient_id, i.name, i.normalized_name, i.category_id,
                  ic.code AS category_code, ic.name AS category_name,
                  i.uses, i.disadvantages, i.base_rating_id,
                  r.code AS base_rating_code, r.severity AS base_severity,
                  i.source, i.is_reviewed
           FROM ingredients i
           JOIN ingredient_categories ic ON ic.category_id = i.category_id
           JOIN ratings r ON r.rating_id = i.base_rating_id
           WHERE i.normalized_name = ?""",
        (name,),
    ).fetchone()
    return dict(row) if row else None


def find_by_alias(alias: str) -> dict | None:
    """Look up an ingredient by an alias."""
    db = get_db()
    row = db.execute(
        """SELECT i.ingredient_id, i.name, i.normalized_name, i.category_id,
                  ic.code AS category_code, ic.name AS category_name,
                  i.uses, i.disadvantages, i.base_rating_id,
                  r.code AS base_rating_code, r.severity AS base_severity,
                  i.source, i.is_reviewed
           FROM ingredient_aliases a
           JOIN ingredients i ON i.ingredient_id = a.ingredient_id
           JOIN ingredient_categories ic ON ic.category_id = i.category_id
           JOIN ratings r ON r.rating_id = i.base_rating_id
           WHERE a.alias_normalized = ?""",
        (alias,),
    ).fetchone()
    return dict(row) if row else None


def resolve_ingredient(normalized_name: str) -> dict | None:
    """Try to find by name, then by alias."""
    result = find_by_normalized_name(normalized_name)
    if result:
        return result
    return find_by_alias(normalized_name)


def insert_ingredient(name: str, normalized_name: str, category_code: str,
                       base_rating_code: str, uses: str | None,
                       disadvantages: str | None, source: str = "ai") -> int:
    """Insert a new ingredient and return its id."""
    db = get_db()
    cat = db.execute("SELECT category_id FROM ingredient_categories WHERE code = ?", (category_code,)).fetchone()
    rat = db.execute("SELECT rating_id FROM ratings WHERE code = ?", (base_rating_code,)).fetchone()
    if not cat or not rat:
        raise ValueError(f"Unknown category '{category_code}' or rating '{base_rating_code}'")

    db.execute(
        """INSERT INTO ingredients (name, normalized_name, category_id, base_rating_id, uses, disadvantages, source, is_reviewed)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0)""",
        (name, normalized_name, cat["category_id"], rat["rating_id"], uses, disadvantages, source),
    )
    db.commit()
    return db.execute("SELECT last_insert_rowid()").fetchone()[0]


def get_age_rating(ingredient_id: int, age_group_id: int) -> dict | None:
    """Get an age-specific rating override if one exists."""
    db = get_db()
    row = db.execute(
        """SELECT iar.rating_id, r.code AS rating_code, r.severity, iar.note
           FROM ingredient_age_ratings iar
           JOIN ratings r ON r.rating_id = iar.rating_id
           WHERE iar.ingredient_id = ? AND iar.age_group_id = ?""",
        (ingredient_id, age_group_id),
    ).fetchone()
    return dict(row) if row else None


def get_condition_risks(ingredient_id: int) -> list[dict]:
    """Get all condition-specific risk overrides for an ingredient."""
    db = get_db()
    rows = db.execute(
        """SELECT icr.condition_id, hc.code AS condition_code,
                  icr.rating_id, r.code AS rating_code, r.severity
           FROM ingredient_condition_risks icr
           JOIN health_conditions hc ON hc.condition_id = icr.condition_id
           JOIN ratings r ON r.rating_id = icr.rating_id
           WHERE icr.ingredient_id = ?""",
        (ingredient_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def get_allergen_links(ingredient_id: int) -> list[dict]:
    """Get allergen links for an ingredient."""
    db = get_db()
    rows = db.execute(
        """SELECT a.allergen_id, a.code, a.name
           FROM ingredient_allergens ia
           JOIN allergens a ON a.allergen_id = ia.allergen_id
           WHERE ia.ingredient_id = ?""",
        (ingredient_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def count_ingredients() -> int:
    """Return total ingredient count."""
    db = get_db()
    return db.execute("SELECT COUNT(*) FROM ingredients").fetchone()[0]


def count_seed_ingredients() -> int:
    """Return count of seed ingredients."""
    db = get_db()
    return db.execute("SELECT COUNT(*) FROM ingredients WHERE source = 'seed'").fetchone()[0]
