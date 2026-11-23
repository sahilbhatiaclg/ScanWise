"""
ScanWise — Normalisation tests.
"""
from app.utils.normalize import normalize_ingredient


class TestNormalize:
    def test_basic(self):
        assert normalize_ingredient("Sugar") == "sugar"

    def test_whitespace(self):
        assert normalize_ingredient("  Palm Oil  ") == "palm oil"

    def test_brackets(self):
        assert normalize_ingredient("Sodium Benzoate (E211)") == "sodium benzoate"

    def test_percentages(self):
        assert normalize_ingredient("Sugar 15%") == "sugar"

    def test_empty(self):
        assert normalize_ingredient("") == ""

    def test_complex(self):
        assert normalize_ingredient("Refined Wheat Flour (Maida) 55%") == "refined wheat flour"

    def test_multiple_spaces(self):
        assert normalize_ingredient("Mono-  and  Diglycerides") == "mono- and diglycerides"
