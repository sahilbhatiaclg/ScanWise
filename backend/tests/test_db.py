"""
ScanWise — Database tests.

Tests that the SQLite schema loads correctly and all 100 seed
ingredients (from ingredients_seed.csv) are present with their
aliases, allergen links, age ratings, and condition risks.
"""


class TestDatabaseSetup:
    """Verify schema creation and seed data loading."""

    def test_tables_exist(self, app):
        """All expected tables should exist."""
        with app.app_context():
            from app.db import get_db
            db = get_db()
            tables = db.execute(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            ).fetchall()
            table_names = {r["name"] for r in tables}

            expected = {
                "roles", "age_groups", "ratings", "product_types",
                "ingredient_categories", "nutrients", "health_conditions",
                "allergens", "skin_types", "dietary_preferences",
                "users", "user_profiles", "user_conditions", "user_allergens",
                "ingredients", "ingredient_aliases", "ingredient_age_ratings",
                "ingredient_allergens", "ingredient_condition_risks",
                "age_group_limits", "products", "product_ingredients",
                "product_nutrition", "reports", "report_items",
                "otp_requests", "refresh_tokens", "audit_log", "scan_events",
                "stg_ingredient_seed",
            }
            for t in expected:
                assert t in table_names, f"Table {t} missing"

    def test_lookup_data_seeded(self, app):
        """Lookup tables should have seed data."""
        with app.app_context():
            from app.db import get_db
            db = get_db()

            assert db.execute("SELECT COUNT(*) FROM roles").fetchone()[0] >= 1
            assert db.execute("SELECT COUNT(*) FROM age_groups").fetchone()[0] == 4
            assert db.execute("SELECT COUNT(*) FROM ratings").fetchone()[0] == 3
            assert db.execute("SELECT COUNT(*) FROM product_types").fetchone()[0] == 4
            assert db.execute("SELECT COUNT(*) FROM ingredient_categories").fetchone()[0] == 19
            assert db.execute("SELECT COUNT(*) FROM nutrients").fetchone()[0] == 6
            assert db.execute("SELECT COUNT(*) FROM health_conditions").fetchone()[0] == 5
            assert db.execute("SELECT COUNT(*) FROM allergens").fetchone()[0] == 12
            assert db.execute("SELECT COUNT(*) FROM skin_types").fetchone()[0] == 5
            assert db.execute("SELECT COUNT(*) FROM dietary_preferences").fetchone()[0] == 5

    def test_ingredients_seeded(self, app):
        """All 100 ingredients from the CSV should be loaded."""
        with app.app_context():
            from app.db import get_db
            db = get_db()
            count = db.execute(
                "SELECT COUNT(*) FROM ingredients WHERE source = 'seed'"
            ).fetchone()[0]
            assert count == 100, f"Expected 100 seed ingredients, got {count}"

    def test_ingredient_aliases_seeded(self, app):
        """Aliases should be loaded (Sugar → Sucrose, Cane Sugar)."""
        with app.app_context():
            from app.db import get_db
            db = get_db()
            count = db.execute("SELECT COUNT(*) FROM ingredient_aliases").fetchone()[0]
            assert count > 0, "No aliases loaded"

            # Check a specific alias
            row = db.execute(
                "SELECT ingredient_id FROM ingredient_aliases WHERE alias_normalized = ?",
                ("sucrose",),
            ).fetchone()
            assert row is not None, "Alias 'sucrose' for Sugar not found"

    def test_ingredient_allergens_seeded(self, app):
        """Allergen links should be loaded."""
        with app.app_context():
            from app.db import get_db
            db = get_db()
            count = db.execute("SELECT COUNT(*) FROM ingredient_allergens").fetchone()[0]
            assert count > 0, "No allergen links loaded"

    def test_age_ratings_seeded(self, app):
        """Age-group rating exceptions should be loaded."""
        with app.app_context():
            from app.db import get_db
            db = get_db()
            count = db.execute("SELECT COUNT(*) FROM ingredient_age_ratings").fetchone()[0]
            assert count > 0, "No age-group rating exceptions loaded"

    def test_condition_risks_seeded(self, app):
        """Condition risk entries should be loaded."""
        with app.app_context():
            from app.db import get_db
            db = get_db()
            count = db.execute("SELECT COUNT(*) FROM ingredient_condition_risks").fetchone()[0]
            assert count > 0, "No condition risk entries loaded"

    def test_specific_ingredient_data(self, app):
        """Spot-check a specific ingredient: Sugar."""
        with app.app_context():
            from app.db import get_db
            db = get_db()

            sugar = db.execute(
                """SELECT i.*, r.code AS rating_code, ic.code AS cat_code
                   FROM ingredients i
                   JOIN ratings r ON r.rating_id = i.base_rating_id
                   JOIN ingredient_categories ic ON ic.category_id = i.category_id
                   WHERE i.normalized_name = 'sugar'"""
            ).fetchone()

            assert sugar is not None, "Sugar not found"
            assert sugar["rating_code"] == "adjustable"
            assert sugar["cat_code"] == "sweetener"
            assert sugar["source"] == "seed"
            assert sugar["is_reviewed"] == 1

    def test_sugar_condition_risk(self, app):
        """Sugar should have a 'risk' rating for diabetes."""
        with app.app_context():
            from app.db import get_db
            db = get_db()

            row = db.execute(
                """SELECT r.code AS rating_code
                   FROM ingredient_condition_risks icr
                   JOIN ingredients i ON i.ingredient_id = icr.ingredient_id
                   JOIN health_conditions hc ON hc.condition_id = icr.condition_id
                   JOIN ratings r ON r.rating_id = icr.rating_id
                   WHERE i.normalized_name = 'sugar' AND hc.code = 'diabetes'"""
            ).fetchone()

            assert row is not None, "Sugar should have diabetes condition risk"
            assert row["rating_code"] == "risk"

    def test_foreign_keys_enabled(self, app):
        """Foreign keys should be enforced."""
        with app.app_context():
            from app.db import get_db
            db = get_db()
            fk = db.execute("PRAGMA foreign_keys").fetchone()[0]
            assert fk == 1, "Foreign keys not enabled"

    def test_ingredient_lookup_by_alias(self, app):
        """Looking up 'e211' should resolve to Sodium Benzoate."""
        with app.app_context():
            from app.repositories.ingredient_repo import resolve_ingredient
            ing = resolve_ingredient("e211")
            assert ing is not None, "Alias e211 should resolve"
            assert ing["normalized_name"] == "sodium benzoate"

    def test_ingredient_count_function(self, app):
        """The count functions should work."""
        with app.app_context():
            from app.repositories.ingredient_repo import count_ingredients, count_seed_ingredients
            total = count_ingredients()
            seed = count_seed_ingredients()
            assert total == 100
            assert seed == 100
