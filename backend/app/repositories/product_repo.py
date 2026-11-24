"""
ScanWise — Product repository (SQLite).
"""
from ..db import get_db


def find_by_hash(phash: str) -> dict | None:
    db = get_db()
    row = db.execute(
        """SELECT p.product_id, p.product_hash, p.label_name, pt.code AS product_type,
                  p.serving_size, p.serving_unit
           FROM products p
           JOIN product_types pt ON pt.product_type_id = p.product_type_id
           WHERE p.product_hash = ?""",
        (phash,),
    ).fetchone()
    return dict(row) if row else None


def create_product(phash: str, product_type_code: str, label_name: str | None = None,
                   serving_size: float | None = None, serving_unit: str | None = None) -> int:
    db = get_db()
    pt = db.execute("SELECT product_type_id FROM product_types WHERE code = ?", (product_type_code,)).fetchone()
    if not pt:
        raise ValueError(f"Unknown product type: {product_type_code}")

    db.execute(
        """INSERT INTO products (product_hash, product_type_id, label_name, serving_size, serving_unit)
           VALUES (?, ?, ?, ?, ?)""",
        (phash, pt["product_type_id"], label_name, serving_size, serving_unit),
    )
    db.commit()
    return db.execute("SELECT last_insert_rowid()").fetchone()[0]


def add_product_ingredient(product_id: int, ingredient_id: int, position: int):
    db = get_db()
    db.execute(
        "INSERT OR IGNORE INTO product_ingredients (product_id, ingredient_id, position) VALUES (?, ?, ?)",
        (product_id, ingredient_id, position),
    )
    db.commit()


def get_product_ingredients(product_id: int) -> list[dict]:
    db = get_db()
    rows = db.execute(
        """SELECT pi.position, pi.ingredient_id, i.name, i.normalized_name,
                  ic.code AS category_code, ic.name AS category_name,
                  r.code AS base_rating_code, i.uses, i.disadvantages
           FROM product_ingredients pi
           JOIN ingredients i ON i.ingredient_id = pi.ingredient_id
           JOIN ingredient_categories ic ON ic.category_id = i.category_id
           JOIN ratings r ON r.rating_id = i.base_rating_id
           ORDER BY pi.position""",
        (product_id,),
    ).fetchall()
    return [dict(r) for r in rows]
