# ScanWise — Remaining Database Work (After `azure_db_setup_guide.md`)

---

> [!IMPORTANT]
> **Follow these steps ONLY AFTER completing all 8 steps in [`azure_db_setup_guide.md`](file:///c:/Users/SAHIL/Desktop/ScanWise/azure_db_setup_guide.md).**
> These instructions are designed to be done sequentially after that guide. They pick up exactly where it leaves off.

---

## What `azure_db_setup_guide.md` Covers vs What's Left

| Area | Covered by Setup Guide? | Remaining? |
|---|---|---|
| Azure SQL Server creation | ✅ Yes (Step 2) | — |
| Database creation (`scanwise_dev`) | ✅ Yes (Step 3) | — |
| Firewall rules | ✅ Yes (Step 4) | — |
| Running `schema.sql` (22 tables, indexes, trigger, stored proc, views, roles) | ✅ Yes (Step 5) | — |
| Schema verification queries | ✅ Yes (Step 5) | — |
| Loading CSV into staging table | ✅ Yes (Step 6, Option A: Import Wizard) | — |
| **Transforming staging data → production tables** | ❌ Mentioned but **no SQL provided** | **Step 1 below** |
| `load_seed.py` (Python seed loader) | ❌ File is empty, guide says "I can write this — say the word" | **Step 2 below** |
| Python venv + `pip install` + `.env` setup | ✅ Yes (Step 7) | — |
| Connection test (one-liner) | ✅ Yes (Step 7) | — |
| Test data verification | ✅ Yes (Step 8, references `database_dev_plan.md`) | — |
| `config.py` (Flask app configuration) | ❌ File is empty | **Step 3 below** |
| `db.py` (connection pool / get_connection helper) | ❌ File is empty | **Step 4 below** |
| `extensions.py` (Flask extension init) | ❌ File is empty | **Step 5 below** |
| Repository files (6 files — all empty) | ❌ All empty | **Step 6 below** |
| Database integration tests | ❌ Test files exist but are empty | **Step 7 below** |

> [!CAUTION]
> **Verdict: After the setup guide, the database is LIVE and SEEDED on Azure, but your Python backend cannot talk to it yet.** The "database role" is only ~60% complete. You still need the Python layer that connects to and queries the database.

---

## Step 1: Transform Staging Data → Production Tables

After loading `ingredients_seed.csv` into `dbo.stg_ingredient_seed` (Setup Guide Step 6), run this SQL in **Azure Data Studio** connected to `scanwise_dev`:

```sql
/* =================================================================
   Transform stg_ingredient_seed → production tables
   Run this ONCE after the CSV import into stg_ingredient_seed.
   ================================================================= */
SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- 1a. Insert into dbo.ingredients
INSERT INTO dbo.ingredients (name, normalized_name, category_id, base_rating_id, uses, disadvantages, source, is_reviewed)
SELECT
    s.name,
    LOWER(TRIM(s.name)),
    c.category_id,
    r.rating_id,
    s.uses,
    s.disadvantages,
    'seed',
    1    -- seed data is pre-reviewed
FROM dbo.stg_ingredient_seed s
JOIN dbo.ingredient_categories c ON c.code = s.category_code
JOIN dbo.ratings               r ON r.code = s.base_rating;

-- 1b. Insert aliases (pipe-separated in the CSV)
INSERT INTO dbo.ingredient_aliases (ingredient_id, alias, alias_normalized)
SELECT i.ingredient_id,
       TRIM(a.value),
       LOWER(TRIM(a.value))
FROM dbo.stg_ingredient_seed s
JOIN dbo.ingredients i ON i.normalized_name = LOWER(TRIM(s.name))
CROSS APPLY STRING_SPLIT(s.aliases, '|') a
WHERE s.aliases IS NOT NULL AND TRIM(a.value) <> '';

-- 1c. Insert allergen links
INSERT INTO dbo.ingredient_allergens (ingredient_id, allergen_id)
SELECT i.ingredient_id, al.allergen_id
FROM dbo.stg_ingredient_seed s
JOIN dbo.ingredients i ON i.normalized_name = LOWER(TRIM(s.name))
CROSS APPLY STRING_SPLIT(s.allergens, '|') a
JOIN dbo.allergens al ON al.code = TRIM(a.value)
WHERE s.allergens IS NOT NULL AND TRIM(a.value) <> '';

-- 1d. Insert age-group exceptions (format: "age_group:rating|age_group:rating")
INSERT INTO dbo.ingredient_age_ratings (ingredient_id, age_group_id, rating_id)
SELECT i.ingredient_id, ag.age_group_id, r.rating_id
FROM dbo.stg_ingredient_seed s
JOIN dbo.ingredients i ON i.normalized_name = LOWER(TRIM(s.name))
CROSS APPLY STRING_SPLIT(s.age_exceptions, '|') a
CROSS APPLY (
    SELECT
        LEFT(TRIM(a.value), CHARINDEX(':', TRIM(a.value)) - 1)  AS age_code,
        RIGHT(TRIM(a.value), LEN(TRIM(a.value)) - CHARINDEX(':', TRIM(a.value))) AS rating_code
) AS parsed
JOIN dbo.age_groups ag ON ag.code = parsed.age_code
JOIN dbo.ratings r     ON r.code  = parsed.rating_code
WHERE s.age_exceptions IS NOT NULL AND TRIM(a.value) <> '' AND CHARINDEX(':', TRIM(a.value)) > 0;

-- 1e. Insert condition risks (format: "condition:rating|condition:rating")
INSERT INTO dbo.ingredient_condition_risks (ingredient_id, condition_id, rating_id)
SELECT i.ingredient_id, hc.condition_id, r.rating_id
FROM dbo.stg_ingredient_seed s
JOIN dbo.ingredients i ON i.normalized_name = LOWER(TRIM(s.name))
CROSS APPLY STRING_SPLIT(s.condition_risks, '|') a
CROSS APPLY (
    SELECT
        LEFT(TRIM(a.value), CHARINDEX(':', TRIM(a.value)) - 1)  AS cond_code,
        RIGHT(TRIM(a.value), LEN(TRIM(a.value)) - CHARINDEX(':', TRIM(a.value))) AS rating_code
) AS parsed
JOIN dbo.health_conditions hc ON hc.code = parsed.cond_code
JOIN dbo.ratings r             ON r.code  = parsed.rating_code
WHERE s.condition_risks IS NOT NULL AND TRIM(a.value) <> '' AND CHARINDEX(':', TRIM(a.value)) > 0;

COMMIT TRANSACTION;
GO

-- Verify the transform
SELECT 'ingredients'              AS tbl, COUNT(*) AS rows FROM dbo.ingredients              WHERE source = 'seed'
UNION ALL SELECT 'aliases',        COUNT(*) FROM dbo.ingredient_aliases
UNION ALL SELECT 'allergen_links', COUNT(*) FROM dbo.ingredient_allergens
UNION ALL SELECT 'age_exceptions', COUNT(*) FROM dbo.ingredient_age_ratings
UNION ALL SELECT 'condition_risks',COUNT(*) FROM dbo.ingredient_condition_risks;
```

**Expected results:**

| Table | Expected Rows (approx) |
|---|---|
| `ingredients` (source='seed') | 100 |
| `aliases` | ~150–200 (most ingredients have 1–2 aliases) |
| `allergen_links` | ~15–25 |
| `age_exceptions` | ~10–20 |
| `condition_risks` | ~20–35 |

---

## Step 2: Write `load_seed.py`

Create [`db/seed/load_seed.py`](file:///c:/Users/SAHIL/Desktop/ScanWise/db/seed/load_seed.py) — this is the Python version of Step 1 above, so you can re-run it programmatically:

```python
"""
load_seed.py — Load ingredients_seed.csv into Azure SQL staging table
and transform into production tables.

Usage:
    cd c:\Users\SAHIL\Desktop\ScanWise\backend
    .\\venv\\Scripts\\Activate.ps1
    python -m db.seed.load_seed          # or:
    python ../db/seed/load_seed.py
"""

import csv
import os
import sys
import pyodbc
from pathlib import Path
from dotenv import load_dotenv

# ---------- Configuration ----------
SEED_DIR = Path(__file__).parent
CSV_PATH = SEED_DIR / "ingredients_seed.csv"

# Load .env from the backend directory
load_dotenv(SEED_DIR.parent.parent / "backend" / ".env")


def get_connection() -> pyodbc.Connection:
    conn_str = (
        f"DRIVER={{{os.getenv('AZURE_SQL_DRIVER')}}};"
        f"SERVER={os.getenv('AZURE_SQL_SERVER')};"
        f"DATABASE={os.getenv('AZURE_SQL_DATABASE')};"
        f"UID={os.getenv('AZURE_SQL_USER')};"
        f"PWD={os.getenv('AZURE_SQL_PASSWORD')};"
        f"Encrypt=yes;TrustServerCertificate=no;"
    )
    return pyodbc.connect(conn_str)


def load_csv_to_staging(cursor: pyodbc.Cursor) -> int:
    """Bulk-insert CSV rows into dbo.stg_ingredient_seed."""
    cursor.execute("DELETE FROM dbo.stg_ingredient_seed")  # idempotent
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = []
        for row in reader:
            rows.append((
                row["name"],
                row["category"],
                row["base_rating"],
                row.get("uses") or None,
                row.get("disadvantages") or None,
                row.get("allergens") or None,
                row.get("age_exceptions") or None,
                row.get("condition_risks") or None,
                row.get("aliases") or None,
            ))
    cursor.executemany(
        """INSERT INTO dbo.stg_ingredient_seed
           (name, category_code, base_rating, uses, disadvantages,
            allergens, age_exceptions, condition_risks, aliases)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        rows,
    )
    return len(rows)


def transform_staging(cursor: pyodbc.Cursor) -> None:
    """Fan out staging rows into production ingredient tables."""
    transform_sql = Path(SEED_DIR / "transform_staging.sql").read_text(encoding="utf-8")
    # Split on GO and execute each batch
    for batch in transform_sql.split("\nGO\n"):
        batch = batch.strip()
        if batch:
            cursor.execute(batch)


def main():
    print(f"Reading CSV from: {CSV_PATH}")
    conn = get_connection()
    conn.autocommit = False
    cursor = conn.cursor()
    try:
        count = load_csv_to_staging(cursor)
        print(f"  Loaded {count} rows into stg_ingredient_seed")

        transform_staging(cursor)
        print("  Transformed into production tables")

        # Verify
        for table in ["ingredients", "ingredient_aliases",
                       "ingredient_allergens", "ingredient_age_ratings",
                       "ingredient_condition_risks"]:
            cursor.execute(f"SELECT COUNT(*) FROM dbo.{table}")
            print(f"    {table}: {cursor.fetchone()[0]} rows")

        conn.commit()
        print("✅ Seed complete!")
    except Exception as e:
        conn.rollback()
        print(f"❌ Error — rolled back: {e}", file=sys.stderr)
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
```

> [!NOTE]
> This script references a `transform_staging.sql` file. Save the SQL from Step 1 above (the part inside the transaction) as [`db/seed/transform_staging.sql`](file:///c:/Users/SAHIL/Desktop/ScanWise/db/seed/transform_staging.sql) so the Python script can read it. Alternatively, you can embed the SQL directly in the Python file.

---

## Step 3: Write `config.py`

Create [`backend/app/config.py`](file:///c:/Users/SAHIL/Desktop/ScanWise/backend/app/config.py):

```python
"""
config.py — Application configuration loaded from environment variables.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""

    # -- Flask --
    SECRET_KEY = os.environ["SECRET_KEY"]
    DEBUG = False
    TESTING = False

    # -- Azure SQL --
    AZURE_SQL_SERVER = os.environ["AZURE_SQL_SERVER"]
    AZURE_SQL_DATABASE = os.environ["AZURE_SQL_DATABASE"]
    AZURE_SQL_USER = os.environ["AZURE_SQL_USER"]
    AZURE_SQL_PASSWORD = os.environ["AZURE_SQL_PASSWORD"]
    AZURE_SQL_DRIVER = os.getenv("AZURE_SQL_DRIVER", "ODBC Driver 18 for SQL Server")

    @property
    def AZURE_SQL_CONNECTION_STRING(self) -> str:
        return (
            f"DRIVER={{{self.AZURE_SQL_DRIVER}}};"
            f"SERVER={self.AZURE_SQL_SERVER};"
            f"DATABASE={self.AZURE_SQL_DATABASE};"
            f"UID={self.AZURE_SQL_USER};"
            f"PWD={self.AZURE_SQL_PASSWORD};"
            f"Encrypt=yes;TrustServerCertificate=no;"
        )

    # -- JWT --
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 900))
    JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", 2592000))

    # -- Gemini AI --
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True


class ProductionConfig(Config):
    pass


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
```

---

## Step 4: Write `db.py`

Create [`backend/app/db.py`](file:///c:/Users/SAHIL/Desktop/ScanWise/backend/app/db.py) — the connection pool that all repositories will use:

```python
"""
db.py — Azure SQL connection pool using pyodbc.

Usage in repositories:
    from app.db import get_connection
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT ...")
"""

import pyodbc
from flask import current_app, g


def get_connection() -> pyodbc.Connection:
    """
    Get a pyodbc connection for the current request.
    Re-uses the same connection within a single Flask request (stored in `g`).
    """
    if "db_conn" not in g:
        conn_str = current_app.config["AZURE_SQL_CONNECTION_STRING"]
        g.db_conn = pyodbc.connect(conn_str)
    return g.db_conn


def close_connection(exception=None):
    """Close the connection at the end of a request. Register with app.teardown_appcontext."""
    conn = g.pop("db_conn", None)
    if conn is not None:
        try:
            if exception:
                conn.rollback()
            else:
                conn.commit()
            conn.close()
        except Exception:
            pass


def init_db(app):
    """Call this in your app factory to register the teardown hook."""
    app.teardown_appcontext(close_connection)
```

---

## Step 5: Write `extensions.py`

Create [`backend/app/extensions.py`](file:///c:/Users/SAHIL/Desktop/ScanWise/backend/app/extensions.py):

```python
"""
extensions.py — Flask extension instances (initialised in the app factory).
"""

# Currently no third-party Flask extensions are needed because:
#   - Database: managed via pyodbc in db.py (no SQLAlchemy/ORM)
#   - JWT: handled manually in security/
#   - CORS: can be added here when needed
#
# This file exists so the app factory has a central place to init extensions.

# Example: when you add Flask-CORS
# from flask_cors import CORS
# cors = CORS()
```

---

## Step 6: Write the Repository Layer (Database Queries in Python)

Each repository wraps the SQL from [`queries.sql`](file:///c:/Users/SAHIL/Desktop/ScanWise/db/queries.sql) into Python functions. Here is the **starter template** for each file — the most critical one is `user_repo.py` since auth depends on it:

### 6a. [`repositories/user_repo.py`](file:///c:/Users/SAHIL/Desktop/ScanWise/backend/app/repositories/user_repo.py)

```python
"""user_repo.py — User CRUD operations against Azure SQL."""

from app.db import get_connection


def create_user(phone_number: str, password_hash: str, role_code: str = "user") -> int:
    """Insert a new user and return the user_id."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO dbo.users (phone_number, password_hash, role_id)
        OUTPUT INSERTED.user_id
        SELECT ?, ?, r.role_id
        FROM dbo.roles r WHERE r.code = ?
        """,
        (phone_number, password_hash, role_code),
    )
    row = cursor.fetchone()
    return row.user_id


def find_by_phone(phone_number: str):
    """Return user row or None."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT user_id, phone_number, password_hash, is_active FROM dbo.users WHERE phone_number = ?",
        (phone_number,),
    )
    return cursor.fetchone()


def find_by_id(user_id: int):
    """Return user row or None."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT user_id, phone_number, is_active FROM dbo.users WHERE user_id = ?",
        (user_id,),
    )
    return cursor.fetchone()
```

### 6b. [`repositories/profile_repo.py`](file:///c:/Users/SAHIL/Desktop/ScanWise/backend/app/repositories/profile_repo.py)

```python
"""profile_repo.py — User profile, conditions, allergens, dietary prefs."""

from app.db import get_connection


def upsert_profile(user_id: int, display_name: str, age_group_code: str, skin_type_code: str = None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        MERGE dbo.user_profiles AS tgt
        USING (SELECT ? AS user_id) AS src ON tgt.user_id = src.user_id
        WHEN MATCHED THEN
            UPDATE SET display_name = ?, age_group_id = (SELECT age_group_id FROM dbo.age_groups WHERE code = ?),
                       skin_type_id = (SELECT skin_type_id FROM dbo.skin_types WHERE code = ?)
        WHEN NOT MATCHED THEN
            INSERT (user_id, display_name, age_group_id, skin_type_id)
            VALUES (?, ?,
                    (SELECT age_group_id FROM dbo.age_groups WHERE code = ?),
                    (SELECT skin_type_id FROM dbo.skin_types WHERE code = ?));
        """,
        (user_id, display_name, age_group_code, skin_type_code,
         user_id, display_name, age_group_code, skin_type_code),
    )


def get_profile(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT up.display_name, ag.code AS age_group, st.code AS skin_type
        FROM dbo.user_profiles up
        JOIN dbo.age_groups ag ON ag.age_group_id = up.age_group_id
        LEFT JOIN dbo.skin_types st ON st.skin_type_id = up.skin_type_id
        WHERE up.user_id = ?
        """,
        (user_id,),
    )
    return cursor.fetchone()
```

### 6c–6f. Other repos follow the same pattern

| File | Wraps Which Queries |
|---|---|
| [`ingredient_repo.py`](file:///c:/Users/SAHIL/Desktop/ScanWise/backend/app/repositories/ingredient_repo.py) | Query 1 (match names), Query 2 (unknowns), Query 13 (AI unreviewed) |
| [`product_repo.py`](file:///c:/Users/SAHIL/Desktop/ScanWise/backend/app/repositories/product_repo.py) | Query 3 (hash lookup), product insert from stored proc |
| [`report_repo.py`](file:///c:/Users/SAHIL/Desktop/ScanWise/backend/app/repositories/report_repo.py) | Query 7 (`sp_save_report`), Query 8 (history), Query 9 (full report), Query 10 (pie chart) |
| [`log_repo.py`](file:///c:/Users/SAHIL/Desktop/ScanWise/backend/app/repositories/log_repo.py) | Audit log inserts, scan_events insert |

> [!TIP]
> You don't need to write all 6 repos at once. Start with `user_repo.py` (needed for auth), then `ingredient_repo.py` and `report_repo.py` (needed for scanning). The others can wait.

---

## Step 7: Smoke-Test the Full Stack (DB → Python)

After `config.py`, `db.py`, and at least `user_repo.py` are written, run this verification:

```powershell
cd c:\Users\SAHIL\Desktop\ScanWise\backend
.\venv\Scripts\Activate.ps1

python -c "
import os; os.environ['FLASK_ENV'] = 'development'
from app.config import DevelopmentConfig
from app.db import get_connection
import pyodbc

conn = pyodbc.connect(DevelopmentConfig().AZURE_SQL_CONNECTION_STRING)
cursor = conn.cursor()

# Test 1: ingredient count
cursor.execute('SELECT COUNT(*) FROM dbo.ingredients')
print(f'Ingredients: {cursor.fetchone()[0]}')

# Test 2: lookup tables
for table in ['roles','age_groups','ratings','allergens','health_conditions']:
    cursor.execute(f'SELECT COUNT(*) FROM dbo.{table}')
    print(f'  {table}: {cursor.fetchone()[0]}')

# Test 3: stored procedure exists
cursor.execute(\"SELECT COUNT(*) FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_NAME = 'sp_save_report'\")
print(f'Stored proc exists: {cursor.fetchone()[0] == 1}')

conn.close()
print('✅ Full stack DB connection verified!')
"
```

---

## Summary: The Complete Database Checklist

| # | Task | When | Status After Setup Guide |
|---|---|---|---|
| 1 | Create Azure SQL Server | Setup Guide Step 2 | ✅ Done |
| 2 | Create `scanwise_dev` database | Setup Guide Step 3 | ✅ Done |
| 3 | Configure firewall | Setup Guide Step 4 | ✅ Done |
| 4 | Run `schema.sql` | Setup Guide Step 5 | ✅ Done |
| 5 | Verify schema | Setup Guide Step 5 | ✅ Done |
| 6 | Load CSV into staging | Setup Guide Step 6 | ✅ Done |
| 7 | **Transform staging → production** | **This guide Step 1** | ❌ Need this guide |
| 8 | **Write `load_seed.py`** | **This guide Step 2** | ❌ Need this guide |
| 9 | Python venv + .env | Setup Guide Step 7 | ✅ Done |
| 10 | Connection test | Setup Guide Step 7 | ✅ Done |
| 11 | **Write `config.py`** | **This guide Step 3** | ❌ Need this guide |
| 12 | **Write `db.py`** | **This guide Step 4** | ❌ Need this guide |
| 13 | **Write `extensions.py`** | **This guide Step 5** | ❌ Need this guide |
| 14 | **Write repository layer** | **This guide Step 6** | ❌ Need this guide |
| 15 | **Full-stack smoke test** | **This guide Step 7** | ❌ Need this guide |

> [!IMPORTANT]
> **Can this guide be followed after `azure_db_setup_guide.md`?**
> **YES — these steps are designed to be done immediately after.** Each step here depends on the previous guide being complete. The order is: Setup Guide Steps 1–8 → This Guide Steps 1–7.

