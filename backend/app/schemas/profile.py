"""
ScanWise — Pydantic schemas for profile.
"""
from pydantic import BaseModel, Field
from typing import Optional


class ProfileUpdate(BaseModel):
    age_group: str
    skin_type: Optional[str] = None
    dietary_preference: Optional[str] = None
    conditions: list[str] = Field(default_factory=list)
    allergens: list[str] = Field(default_factory=list)


class ProfileResponse(BaseModel):
    age_group: str
    age_group_label: Optional[str] = None
    skin_type: Optional[str] = None
    dietary_preference: Optional[str] = None
    conditions: list[dict] = Field(default_factory=list)
    allergens: list[dict] = Field(default_factory=list)
