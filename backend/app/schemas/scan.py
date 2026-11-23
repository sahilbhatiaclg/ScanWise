"""
ScanWise — Pydantic schemas for scan requests/responses.
"""
from pydantic import BaseModel, Field
from typing import Optional


class ExtractionResult(BaseModel):
    """Structured data returned from the AI extraction step."""
    product_name: Optional[str] = None
    product_type: str = "food"
    ingredients: list[str] = Field(default_factory=list)
    nutrition: Optional[dict] = None
    allergen_statement: Optional[str] = None
    warnings: Optional[str] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class AnalyzeRequest(BaseModel):
    """Body for POST /api/scans/:id/analyze."""
    ingredients: list[str]
    product_name: Optional[str] = None
    product_type: str = "food"
    age_group: str = "adult"
    conditions: list[str] = Field(default_factory=list)
    allergens: list[str] = Field(default_factory=list)
    nutrition: Optional[dict] = None
    user_description: Optional[str] = None


class IngredientReport(BaseModel):
    """One ingredient in the report."""
    name: str
    category: str
    rating: str  # safe, adjustable, risk
    uses: Optional[str] = None
    disadvantages: Optional[str] = None
    reason: Optional[str] = None


class ScanReport(BaseModel):
    """Full report returned to the frontend."""
    public_id: Optional[str] = None
    product_name: str
    product_type: str
    verdict: str  # good, okay, avoid
    overall_score: int = Field(ge=0, le=100)
    ingredients: list[IngredientReport] = Field(default_factory=list)
    pie_by_rating: dict = Field(default_factory=dict)
    pie_by_category: dict = Field(default_factory=dict)
    max_servings_per_day: Optional[float] = None
    days_per_week: Optional[int] = None
    guidance_basis: Optional[str] = None
    disclaimer: str = "This is general information, not medical advice. Consult a healthcare professional for personalised dietary guidance."
