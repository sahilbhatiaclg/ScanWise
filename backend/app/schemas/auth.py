"""
ScanWise — Pydantic schemas for auth.
"""
from pydantic import BaseModel, Field
from typing import Optional


class OtpRequest(BaseModel):
    phone_number: str = Field(..., min_length=10, max_length=15)


class OtpVerify(BaseModel):
    phone_number: str = Field(..., min_length=10, max_length=15)
    otp: str = Field(..., min_length=4, max_length=6)
    consent: bool = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: Optional[int] = None
    is_new: bool = False


class GuestTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str = "guest"
