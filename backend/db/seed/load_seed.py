"""
load_seed.py - load db/seed/ingredients_seed.csv into dbo.stg_ingredient_seed,
then run transform_staging.sql to fill the production ingredient tables.

Run from the repo root, with backend/.env filled in and the venv active:
    python db/seed/load_seed.py              # real load (uses the ADMIN login)
    python db/seed/load_seed.py --dry-run    # parse the CSV only, no database needed

Safe to run twice: staging is emptied first and the transform skips rows that exist.
"""
import csv
import os
import re
import sys
from pathlib import Path

SEED_DIR = Path(__file__).resolve().parent
CSV_PATH = SEED_DIR / "ingredients_seed.csv"
SQL_PATH = SEED_DIR / "transform_staging.sql"
ENV_PATH = SEED_DIR.parent.parent / "backend" / ".env"

EXPECTED_COLUMNS = ["name", "category", "base_rating", "uses", "disadvantages",
                    "allergens", "age_exceptions", "condition_risks", "aliases"]


def read_rows():
    with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:   # utf-8-sig survives an Excel BOM
        reader = csv.DictReader(f)
        if reader.fieldnames != EXPECTED_COLUMNS:
            sys.exit(f"CSV header mismatch.\n  expected: {EXPECTED_COLUMNS}\n  found:    {reader.fieldnames}")
        rows = []
        for n, r in enumerate(reader, start=2):
            if not (r["name"] or "").strip():
                sys.exit(f"CSV line {n}: empty name")
            rows.append(tuple((r[c] or "").strip() or None for c in EXPECTED_COLUMNS))
    return rows


def connect():
    import pyodbc
    from dotenv import load_dotenv
    load_dotenv(ENV_PATH)
    need = ["AZURE_SQL_SERVER", "AZURE_SQL_DATABASE", "AZURE_SQL_USER", "AZURE_SQL_PASSWORD"]
    missing = [k for k in need if not os.getenv(k)]
    if missing:
        sys.exit(f"Missing in {ENV_PATH}: {', '.join(missing)}")
    driver = os.getenv("AZURE_SQL_DRIVER", "ODBC Driver 18 for SQL Server")
    return pyodbc.connect(
        f"DRIVER={{{driver}}};SERVER={os.environ['AZURE_SQL_SERVER']};"
        f"DATABASE={os.environ['AZURE_SQL_DATABASE']};UID={os.environ['AZURE_SQL_USER']};"
        f"PWD={os.environ['AZURE_SQL_PASSWORD']};Encrypt=yes;TrustServerCertificate=no;",
        autocommit=False,
    )


def batches(sql_text):
    """Split on lines that contain only GO (the way SSMS / Azure Data Studio do)."""
    return [b.strip() for b in re.split(r"^\s*GO\s*$", sql_text, flags=re.IGNORECASE | re.MULTILINE) if b.strip()]


def main():
    rows = read_rows()
    print(f"Read {len(rows)} rows from {CSV_PATH.name}")
    if "--dry-run" in sys.argv:
        print("Dry run: nothing written.")
        return

    conn = connect()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM dbo.stg_ingredient_seed")
        cur.executemany(
            """INSERT INTO dbo.stg_ingredient_seed
               (name, category_code, base_rating, uses, disadvantages, allergens, age_exceptions, condition_risks, aliases)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            rows,
        )
        print(f"Loaded {len(rows)} rows into dbo.stg_ingredient_seed")

        for b in batches(SQL_PATH.read_text(encoding="utf-8")):
            cur.execute(b)
            while cur.description is None and cur.nextset():
                pass
            if cur.description:                      # the final verification SELECT
                print("\nRow counts after transform:")
                for tbl, n in cur.fetchall():
                    print(f"  {tbl:<28} {n}")
        conn.commit()
        print("\nSeed complete.")
    except Exception as e:
        conn.rollback()
        print(f"\nFAILED - rolled back, nothing was changed: {e}", file=sys.stderr)
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()