"""
ScanWise — Personalization service tests.
"""


class TestPersonalization:
    def test_base_rating_no_modifiers(self, app):
        """Without modifiers, the base rating should be used."""
        with app.app_context():
            from app.repositories.ingredient_repo import resolve_ingredient
            from app.services.personalization_service import personalize_ingredient

            ing = resolve_ingredient("sugar")
            assert ing is not None

            result = personalize_ingredient(ing, "adult", [], [])
            assert result["personalised_rating"] == "adjustable"

    def test_diabetes_raises_sugar_to_risk(self, app):
        """Sugar + diabetes should become risk."""
        with app.app_context():
            from app.repositories.ingredient_repo import resolve_ingredient
            from app.services.personalization_service import personalize_ingredient

            ing = resolve_ingredient("sugar")
            result = personalize_ingredient(ing, "adult", ["diabetes"], [])
            assert result["personalised_rating"] == "risk"

    def test_allergen_match_always_risk(self, app):
        """An allergen match should always set the rating to risk."""
        with app.app_context():
            from app.repositories.ingredient_repo import resolve_ingredient
            from app.services.personalization_service import personalize_ingredient

            ing = resolve_ingredient("soy lecithin")
            assert ing is not None
            result = personalize_ingredient(ing, "adult", [], ["soy"])
            assert result["personalised_rating"] == "risk"

    def test_verdict_all_safe(self, app):
        """All safe ingredients should give a 'good' verdict."""
        with app.app_context():
            from app.services.personalization_service import compute_verdict
            ingredients = [
                {"personalised_rating": "safe"},
                {"personalised_rating": "safe"},
                {"personalised_rating": "safe"},
            ]
            verdict, score = compute_verdict(ingredients)
            assert verdict == "good"
            assert score == 100

    def test_verdict_many_risk(self, app):
        """Many risk ingredients should give an 'avoid' verdict."""
        with app.app_context():
            from app.services.personalization_service import compute_verdict
            ingredients = [
                {"personalised_rating": "risk"},
                {"personalised_rating": "risk"},
                {"personalised_rating": "risk"},
                {"personalised_rating": "safe"},
            ]
            verdict, score = compute_verdict(ingredients)
            assert verdict == "avoid"
