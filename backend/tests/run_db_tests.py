"""
ScanWise — Comprehensive Database and Backend Unit Tests.
"""
import os
import sys
import unittest
from pathlib import Path

# Ensure backend root is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app import create_app
from app.db import get_db, init_db
from app.repositories import ingredient_repo, user_repo, profile_repo, product_repo, report_repo, log_repo
from app.services.personalization_service import personalize_ingredient, compute_verdict
from app.services.report_service import save_report


class TestScanWiseDatabase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Create a testing Flask app with a clean test database."""
        cls.app = create_app("testing")
        # Remove old test db file if exists
        db_file = cls.app.config["DATABASE"]
        if os.path.exists(db_file):
            try:
                os.remove(db_file)
            except OSError:
                pass

        cls.app_context = cls.app.app_context()
        cls.app_context.push()
        init_db(cls.app)

    @classmethod
    def tearDownClass(cls):
        cls.app_context.pop()
        db_file = cls.app.config["DATABASE"]
        if os.path.exists(db_file):
            try:
                os.remove(db_file)
            except OSError:
                pass

    def test_01_all_tables_exist(self):
        """Verify that all core SQLite tables are created."""
        db = get_db()
        tables = db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        table_names = {r["name"] for r in tables}

        expected_tables = [
            "roles", "age_groups", "ratings", "product_types",
            "ingredient_categories", "nutrients", "health_conditions",
            "allergens", "skin_types", "dietary_preferences",
            "users", "user_profiles", "user_conditions", "user_allergens",
            "ingredients", "ingredient_aliases", "ingredient_age_ratings",
            "ingredient_allergens", "ingredient_condition_risks",
            "age_group_limits", "products", "product_ingredients",
            "product_nutrition", "reports", "report_items",
            "otp_requests", "refresh_tokens", "audit_log", "scan_events"
        ]
        for t in expected_tables:
            self.assertIn(t, table_names, f"Missing table: {t}")

    def test_02_lookup_tables_counts(self):
        """Verify all lookup tables are populated."""
        db = get_db()
        self.assertGreaterEqual(db.execute("SELECT COUNT(*) FROM roles").fetchone()[0], 1)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM age_groups").fetchone()[0], 4)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM ratings").fetchone()[0], 3)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM product_types").fetchone()[0], 4)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM ingredient_categories").fetchone()[0], 19)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM nutrients").fetchone()[0], 6)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM health_conditions").fetchone()[0], 5)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM allergens").fetchone()[0], 12)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM skin_types").fetchone()[0], 5)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM dietary_preferences").fetchone()[0], 5)

    def test_03_exact_ingredient_count(self):
        """Verify all 100 seed ingredients from ingredients_seed.csv are present."""
        total = ingredient_repo.count_ingredients()
        seed_count = ingredient_repo.count_seed_ingredients()
        self.assertEqual(seed_count, 100, f"Expected 100 seed ingredients, found {seed_count}")
        self.assertEqual(total, 100, f"Expected total 100 ingredients, found {total}")

    def test_04_ingredient_aliases_and_allergens(self):
        """Verify aliases, allergen mappings, and age ratings are loaded."""
        db = get_db()
        aliases_count = db.execute("SELECT COUNT(*) FROM ingredient_aliases").fetchone()[0]
        allergens_count = db.execute("SELECT COUNT(*) FROM ingredient_allergens").fetchone()[0]
        age_ratings_count = db.execute("SELECT COUNT(*) FROM ingredient_age_ratings").fetchone()[0]
        condition_risks_count = db.execute("SELECT COUNT(*) FROM ingredient_condition_risks").fetchone()[0]

        self.assertGreater(aliases_count, 50, f"Expected >50 aliases, found {aliases_count}")
        self.assertGreaterEqual(allergens_count, 10, f"Expected >=10 allergen links, found {allergens_count}")
        self.assertGreater(age_ratings_count, 15, f"Expected >15 age ratings, found {age_ratings_count}")
        self.assertGreater(condition_risks_count, 20, f"Expected >20 condition risks, found {condition_risks_count}")

    def test_05_alias_resolution(self):
        """Verify that ingredient aliases resolve to the primary ingredient."""
        # e211 -> Sodium Benzoate
        e211 = ingredient_repo.resolve_ingredient("e211")
        self.assertIsNotNone(e211, "Alias 'e211' should resolve")
        self.assertEqual(e211["normalized_name"], "sodium benzoate")

        # sucrose -> Sugar
        sucrose = ingredient_repo.resolve_ingredient("sucrose")
        self.assertIsNotNone(sucrose, "Alias 'sucrose' should resolve")
        self.assertEqual(sucrose["normalized_name"], "sugar")

    def test_06_personalization_rules(self):
        """Verify personalization adjustments (diabetes + sugar -> risk)."""
        sugar = ingredient_repo.resolve_ingredient("sugar")
        self.assertIsNotNone(sugar)

        # Adult without conditions: adjustable
        normal_res = personalize_ingredient(sugar, "adult", [], [])
        self.assertEqual(normal_res["personalised_rating"], "adjustable")

        # Adult with diabetes: risk
        diabetes_res = personalize_ingredient(sugar, "adult", ["diabetes"], [])
        self.assertEqual(diabetes_res["personalised_rating"], "risk")
        self.assertIn("diabetes", diabetes_res["reason"].lower())

    def test_07_allergen_personalization(self):
        """Verify allergen matching elevates rating to risk."""
        soy_lecithin = ingredient_repo.resolve_ingredient("soy lecithin")
        self.assertIsNotNone(soy_lecithin)

        res = personalize_ingredient(soy_lecithin, "adult", [], ["soy"])
        self.assertEqual(res["personalised_rating"], "risk")
        self.assertIn("allergen", res["reason"].lower())

    def test_08_verdict_computation(self):
        """Verify verdict calculation logic."""
        safe_list = [{"personalised_rating": "safe"} for _ in range(5)]
        verdict, score = compute_verdict(safe_list)
        self.assertEqual(verdict, "good")
        self.assertEqual(score, 100)

        mixed_list = [
            {"personalised_rating": "safe"},
            {"personalised_rating": "adjustable"},
            {"personalised_rating": "risk"}
        ]
        verdict, score = compute_verdict(mixed_list)
        self.assertEqual(verdict, "okay")

        risky_list = [{"personalised_rating": "risk"} for _ in range(4)]
        verdict, score = compute_verdict(risky_list)
        self.assertEqual(verdict, "avoid")
        self.assertEqual(score, 0)

    def test_09_user_creation_and_profile_upsert(self):
        """Verify user registration and profile management."""
        user_id = user_repo.create_user("9876543210", "2026-11-23T10:00:00Z")
        self.assertIsInstance(user_id, int)

        profile_repo.upsert_profile(
            user_id=user_id,
            age_group_code="adult",
            skin_type_code="sensitive",
            dietary_code="vegetarian",
            condition_codes=["diabetes"],
            allergen_codes=["peanut"]
        )

        profile = profile_repo.get_profile(user_id)
        self.assertIsNotNone(profile)
        self.assertEqual(profile["age_group_code"], "adult")
        self.assertEqual(profile["skin_type_code"], "sensitive")
        cond_codes = [c["code"] for c in profile["conditions"]]
        self.assertIn("diabetes", cond_codes)
        alg_codes = [a["code"] for a in profile["allergens"]]
        self.assertIn("peanut", alg_codes)

    def test_10_save_and_retrieve_report(self):
        """Verify end-to-end report generation and persistence in SQLite."""
        user_id = user_repo.create_user("9870000001", "2026-11-23T10:00:00Z")
        sugar = ingredient_repo.resolve_ingredient("sugar")
        salt = ingredient_repo.resolve_ingredient("salt")

        personalised = [
            personalize_ingredient(sugar, "adult", ["diabetes"], []),
            personalize_ingredient(salt, "adult", [], [])
        ]

        report = save_report(
            user_id=user_id,
            product_name="Test Cookie",
            product_type="food",
            personalised_ingredients=personalised,
            verdict="okay",
            overall_score=60,
            age_group_code="adult",
            user_description="Snack biscuit",
            max_servings_per_day=2.0,
            days_per_week=4,
            guidance_basis="rule"
        )

        self.assertIn("public_id", report)
        public_id = report["public_id"]

        # Retrieve report
        loaded = report_repo.get_report_by_public_id(public_id, user_id)
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded["user_product_name"], "Test Cookie")
        self.assertEqual(loaded["verdict"], "okay")
        self.assertEqual(len(loaded["items"]), 2)

        # Audit log entry exists
        db = get_db()
        audit = db.execute("SELECT * FROM audit_log WHERE user_id = ?", (user_id,)).fetchone()
        self.assertIsNotNone(audit)
        self.assertEqual(audit["action"], "REPORT_CREATED")


if __name__ == "__main__":
    unittest.main(verbosity=2)
