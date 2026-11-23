"""
ScanWise — Hashing utilities.

SHA-256 for OTPs, refresh tokens, and product hashes.
"""
import hashlib


def sha256_hex(value: str) -> str:
    """Return the hex SHA-256 of a UTF-8 string."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def product_hash(normalized_names: list[str], product_type: str) -> str:
    """Compute a deterministic product hash from sorted ingredient names + type."""
    payload = "|".join(sorted(normalized_names)) + "||" + product_type
    return sha256_hex(payload)
