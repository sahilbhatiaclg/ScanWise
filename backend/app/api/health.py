"""
ScanWise — Health check endpoint.
"""
from flask import Blueprint, jsonify

from ..db import get_db

health_bp = Blueprint("health", __name__, url_prefix="/api")


@health_bp.route("/health", methods=["GET"])
def health():
    """Liveness check: returns ok and ingredient count."""
    try:
        db = get_db()
        count = db.execute("SELECT COUNT(*) FROM ingredients").fetchone()[0]
        return jsonify({"status": "ok", "ingredients_loaded": count})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
