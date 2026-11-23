"""
ScanWise — OTP service.

Mock OTP for development. In production, plug in a real SMS provider.
"""
import logging
import secrets
from datetime import datetime, timedelta, timezone

from ..db import get_db
from ..utils.hashing import sha256_hex

logger = logging.getLogger(__name__)

# In development, the OTP is always this value (easy to test)
DEV_OTP = "123456"
OTP_EXPIRY_MINUTES = 5
MAX_ATTEMPTS = 5


def request_otp(phone: str) -> str:
    """Generate and store an OTP for the given phone number.

    Returns the OTP (in dev mode; in production, sends via SMS and returns nothing).
    """
    db = get_db()
    otp = DEV_OTP  # In production: secrets.token_digits(6)
    otp_hash = sha256_hex(otp)
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=OTP_EXPIRY_MINUTES)

    db.execute(
        """INSERT INTO otp_requests (phone_number, otp_hash, expires_at)
           VALUES (?, ?, ?)""",
        (phone, otp_hash, expires.strftime("%Y-%m-%dT%H:%M:%SZ")),
    )
    db.commit()

    logger.info("OTP generated for %s (dev mode: %s)", phone[-4:], otp)
    return otp


def verify_otp(phone: str, otp: str) -> bool:
    """Verify the OTP for a phone number. Returns True if valid."""
    db = get_db()
    otp_hash = sha256_hex(otp)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Find the latest unused OTP for this phone
    row = db.execute(
        """SELECT otp_id, otp_hash, attempts
           FROM otp_requests
           WHERE phone_number = ?
             AND consumed_at IS NULL
             AND expires_at > ?
           ORDER BY created_at DESC
           LIMIT 1""",
        (phone, now),
    ).fetchone()

    if not row:
        return False

    # Check attempts
    if row["attempts"] >= MAX_ATTEMPTS:
        return False

    # Increment attempts
    db.execute(
        "UPDATE otp_requests SET attempts = attempts + 1 WHERE otp_id = ?",
        (row["otp_id"],),
    )

    if row["otp_hash"] != otp_hash:
        db.commit()
        return False

    # Mark consumed
    db.execute(
        "UPDATE otp_requests SET consumed_at = ? WHERE otp_id = ?",
        (now, row["otp_id"]),
    )
    db.commit()
    return True
