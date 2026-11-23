"""
ScanWise — Profile API (GET/PUT profile).
"""
from flask import Blueprint, jsonify, request

from ..repositories import profile_repo
from ..security.decorators import jwt_required, role_required, get_jwt_identity

profile_bp = Blueprint("profile", __name__, url_prefix="/api")


@profile_bp.route("/profile", methods=["GET"])
@jwt_required()
@role_required("user")
def get_profile():
    """Return the user's profile."""
    user_id = int(get_jwt_identity())
    profile = profile_repo.get_profile(user_id)
    if not profile:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "Profile not set up yet"}}), 404

    return jsonify({
        "age_group": profile.get("age_group_code"),
        "age_group_label": profile.get("age_group_label"),
        "skin_type": profile.get("skin_type_code"),
        "dietary_preference": profile.get("dietary_code"),
        "conditions": profile.get("conditions", []),
        "allergens": profile.get("allergens", []),
    })


@profile_bp.route("/profile", methods=["PUT"])
@jwt_required()
@role_required("user")
def update_profile():
    """Create or update the user's profile."""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    age_group = data.get("age_group")
    if not age_group:
        return jsonify({"error": {"code": "VALIDATION", "message": "age_group is required"}}), 400

    try:
        profile_repo.upsert_profile(
            user_id=user_id,
            age_group_code=age_group,
            skin_type_code=data.get("skin_type"),
            dietary_code=data.get("dietary_preference"),
            condition_codes=data.get("conditions", []),
            allergen_codes=data.get("allergens", []),
        )
    except ValueError as e:
        return jsonify({"error": {"code": "VALIDATION", "message": str(e)}}), 400

    return jsonify({"message": "Profile updated"})
