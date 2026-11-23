"""
ScanWise — SQLite database layer.

Provides get_db() for per-request connections inside Flask,
and init_db() to create/seed the schema on startup.
"""
import csv
import os
import sqlite3
from pathlib import Path

from flask import g, current_app

DB_DIR = Path(__file__).resolve().parent.parent.parent  # repo root
SCHEMA_PATH = DB_DIR / "db" / "schema.sql"
SEED_CSV = DB_DIR / "db" / "seed" / "ingredients_seed.csv"


def _db_path() -> str:
    """Return the configured database path, defaulting to instance/scanwise.db."""
    return current_app.config.get("DATABASE") or os.path.join(current_app.instance_path, "scanwise.db")


def get_db() -> sqlite3.Connection:
    """Return a per-request SQLite connection (stored on flask.g)."""
    if "db" not in g:
        g.db = sqlite3.connect(_db_path())
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
        g.db.execute("PRAGMA journal_mode = WAL")
    return g.db


def close_db(e=None):
    """Close the per-request connection (registered as teardown)."""
    db = g.pop("db", None)
    if db is not None:
        db.close()


# ------------------------------------------------------------------
# Schema + seed
# ------------------------------------------------------------------

def init_db(app=None):
    """Create tables and seed lookup + ingredient data.

    Safe to call repeatedly: every CREATE/INSERT uses IF NOT EXISTS / OR IGNORE.
    """
    target_app = app or current_app._get_current_object()

    os.makedirs(target_app.instance_path, exist_ok=True)
    db_file = target_app.config.get("DATABASE") or os.path.join(target_app.instance_path, "scanwise.db")

    conn = sqlite3.connect(db_file)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")

    # 1. Run the DDL schema
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))

    # 2. Seed ingredients from CSV (skip if already seeded)
    row = conn.execute("SELECT COUNT(*) AS n FROM ingredients").fetchone()
    if row["n"] == 0 and SEED_CSV.exists():
        _seed_ingredients(conn)

    conn.commit()
    conn.close()


def _seed_ingredients(conn: sqlite3.Connection):
    """Load ingredients_seed.csv directly into the production tables."""
    with open(SEED_CSV, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get("name") or "").strip()
            if not name:
                continue

            normalized = name.lower().strip()
            category_code = (row.get("category") or "").strip()
            base_rating_code = (row.get("base_rating") or "").strip()
            uses = (row.get("uses") or "").strip() or None
            disadvantages = (row.get("disadvantages") or "").strip() or None
            allergens_str = (row.get("allergens") or "").strip()
            age_exceptions_str = (row.get("age_exceptions") or "").strip()
            condition_risks_str = (row.get("condition_risks") or "").strip()
            aliases_str = (row.get("aliases") or "").strip()

            # Resolve category_id
            cat_row = conn.execute(
                "SELECT category_id FROM ingredient_categories WHERE code = ?",
                (category_code,),
            ).fetchone()
            if not cat_row:
                continue
            category_id = cat_row["category_id"]

            # Resolve rating_id
            rat_row = conn.execute(
                "SELECT rating_id FROM ratings WHERE code = ?",
                (base_rating_code,),
            ).fetchone()
            if not rat_row:
                continue
            rating_id = rat_row["rating_id"]

            # Check if already exists
            existing = conn.execute(
                "SELECT ingredient_id FROM ingredients WHERE normalized_name = ?",
                (normalized,),
            ).fetchone()
            if existing:
                continue

            conn.execute(
                """INSERT INTO ingredients
                   (name, normalized_name, category_id, base_rating_id, uses, disadvantages, source, is_reviewed)
                   VALUES (?, ?, ?, ?, ?, ?, 'seed', 1)""",
                (name, normalized, category_id, rating_id, uses, disadvantages),
            )
            ing_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

            # Aliases
            if aliases_str:
                for alias in aliases_str.split("|"):
                    alias = alias.strip()
                    if alias:
                        try:
                            conn.execute(
                                "INSERT OR IGNORE INTO ingredient_aliases (ingredient_id, alias_normalized) VALUES (?, ?)",
                                (ing_id, alias.lower().strip()),
                            )
                        except sqlite3.IntegrityError:
                            pass

            # Allergen links
            if allergens_str:
                for alg_code in allergens_str.split("|"):
                    alg_code = alg_code.strip()
                    if alg_code:
                        alg_row = conn.execute(
                            "SELECT allergen_id FROM allergens WHERE code = ?",
                            (alg_code,),
                        ).fetchone()
                        if alg_row:
                            conn.execute(
                                "INSERT OR IGNORE INTO ingredient_allergens (ingredient_id, allergen_id) VALUES (?, ?)",
                                (ing_id, alg_row["allergen_id"]),
                            )

            # Age exceptions (format: age_group:rating|age_group:rating)
            if age_exceptions_str:
                for pair in age_exceptions_str.split("|"):
                    pair = pair.strip()
                    if ":" in pair:
                        ag_code, r_code = pair.split(":", 1)
                        ag_row = conn.execute(
                            "SELECT age_group_id FROM age_groups WHERE code = ?",
                            (ag_code.strip(),),
                        ).fetchone()
                        r_row = conn.execute(
                            "SELECT rating_id FROM ratings WHERE code = ?",
                            (r_code.strip(),),
                        ).fetchone()
                        if ag_row and r_row:
                            conn.execute(
                                "INSERT OR IGNORE INTO ingredient_age_ratings (ingredient_id, age_group_id, rating_id) VALUES (?, ?, ?)",
                                (ing_id, ag_row["age_group_id"], r_row["rating_id"]),
                            )

            # Condition risks (format: condition:rating|condition:rating)
            if condition_risks_str:
                for pair in condition_risks_str.split("|"):
                    pair = pair.strip()
                    if ":" in pair:
                        cond_code, r_code = pair.split(":", 1)
                        cond_row = conn.execute(
                            "SELECT condition_id FROM health_conditions WHERE code = ?",
                            (cond_code.strip(),),
                        ).fetchone()
                        r_row = conn.execute(
                            "SELECT rating_id FROM ratings WHERE code = ?",
                            (r_code.strip(),),
                        ).fetchone()
                        if cond_row and r_row:
                            conn.execute(
                                "INSERT OR IGNORE INTO ingredient_condition_risks (ingredient_id, condition_id, rating_id) VALUES (?, ?, ?)",
                                (ing_id, cond_row["condition_id"], r_row["rating_id"]),
                            )
