"""
ScanWise — Image validation helpers.

Checks file signature (magic bytes), size, and re-encodes with Pillow
to strip any embedded payloads.
"""
import io
from PIL import Image

MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_SIGNATURES = {
    b"\xff\xd8\xff": "jpeg",
    b"\x89PNG": "png",
    b"RIFF": "webp",
}


def validate_image(data: bytes) -> tuple[bool, str]:
    """Validate image bytes. Returns (is_valid, error_message)."""
    if len(data) > MAX_SIZE_BYTES:
        return False, f"Image exceeds {MAX_SIZE_BYTES // (1024*1024)} MB limit"

    # Check magic bytes
    matched = False
    for sig in ALLOWED_SIGNATURES:
        if data[:len(sig)] == sig:
            matched = True
            break
    if not matched:
        return False, "Unsupported image format. Use JPG, PNG or WebP."

    # Try to open and re-encode
    try:
        img = Image.open(io.BytesIO(data))
        img.verify()
    except Exception:
        return False, "Corrupted or unreadable image file"

    return True, ""


def reencode_image(data: bytes, max_dimension: int = 1600) -> bytes:
    """Re-encode image to JPEG, resizing if needed. Strips metadata."""
    img = Image.open(io.BytesIO(data))
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    # Resize if too large
    w, h = img.size
    if max(w, h) > max_dimension:
        ratio = max_dimension / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()
