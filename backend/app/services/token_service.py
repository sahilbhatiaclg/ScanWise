"""
ScanWise — Token generation and revocation service using PyJWT.
"""
from datetime import datetime, timedelta, timezone
from flask import current_app
import jwt

from ..db import get_db
from ..utils.hashing import sha256_hex


def issue_tokens(user_id: int, role: str = "user") -> dict:
    """Issue standard access and refresh tokens."""
    secret = current_app.config.get("JWT_SECRET_KEY", "dev-secret-jwt")
    access_expiry = current_app.config.get("JWT_ACCESS_TOKEN_EXPIRES", timedelta(minutes=15))
    refresh_expiry = current_app.config.get("JWT_REFRESH_TOKEN_EXPIRES", timedelta(days=30))

    import uuid
    now = datetime.now(timezone.utc)

    access_payload = {
        "sub": str(user_id),
        "user_id": user_id,
        "role": role,
        "type": "access",
        "jti": uuid.uuid4().hex,
        "iat": now,
        "exp": now + access_expiry,
    }
    refresh_payload = {
        "sub": str(user_id),
        "user_id": user_id,
        "role": role,
        "type": "refresh",
        "jti": uuid.uuid4().hex,
        "iat": now,
        "exp": now + refresh_expiry,
    }

    access_token = jwt.encode(access_payload, secret, algorithm="HS256")
    refresh_token = jwt.encode(refresh_payload, secret, algorithm="HS256")

    # Store refresh token hash for revocation check
    db = get_db()
    token_hash = sha256_hex(refresh_token)
    expires_at_str = (now + refresh_expiry).strftime("%Y-%m-%dT%H:%M:%SZ")
    now_str = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    db.execute(
        """INSERT INTO refresh_tokens (user_id, token_hash, issued_at, expires_at)
           VALUES (?, ?, ?, ?)""",
        (user_id, token_hash, now_str, expires_at_str),
    )
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
    }


def issue_guest_token() -> str:
    """Issue a short-lived guest access token."""
    secret = current_app.config.get("JWT_SECRET_KEY", "dev-secret-jwt")
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "guest",
        "role": "guest",
        "type": "access",
        "iat": now,
        "exp": now + timedelta(hours=2),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def revoke_refresh_token(token: str):
    """Revoke a refresh token."""
    db = get_db()
    token_hash = sha256_hex(token)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    db.execute(
        "UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
        (now, token_hash),
    )
    db.commit()
