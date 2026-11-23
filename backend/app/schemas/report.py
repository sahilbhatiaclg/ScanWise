"""
ScanWise — Pydantic schemas for reports.
"""
from pydantic import BaseModel, Field
from typing import Optional


class ReportSummary(BaseModel):
    public_id: str
    user_product_name: str
    verdict: str
    overall_score: int
    created_at: str


class ReportDetail(BaseModel):
    public_id: str
    user_product_name: str
    user_description: Optional[str] = None
    verdict: str
    overall_score: int
    max_servings_per_day: Optional[float] = None
    days_per_week: Optional[int] = None
    guidance_basis: Optional[str] = None
    created_at: str
    age_group: str
    label_name: Optional[str] = None
    product_type: str
    items: list[dict] = Field(default_factory=list)
