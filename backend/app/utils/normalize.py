"""
ScanWise — Ingredient name normalisation.

Lowercase, strip whitespace, remove bracketed notes and percentages,
so that 'Sodium Benzoate (E211)' and 'sodium benzoate' match.
"""
import re

_BRACKET_RE = re.compile(r"\s*\([^)]*\)")
_PERCENT_RE = re.compile(r"\s*[\d.]+\s*%")
_MULTI_SPACE = re.compile(r"\s+")


def normalize_ingredient(name: str) -> str:
    """Return a normalized ingredient name for database lookup."""
    if not name:
        return ""
    s = name.strip()
    s = _BRACKET_RE.sub("", s)
    s = _PERCENT_RE.sub("", s)
    s = _MULTI_SPACE.sub(" ", s)
    return s.strip().lower()
