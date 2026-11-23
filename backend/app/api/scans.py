"""
ScanWise — Scan API (upload image, review, analyze).
"""
import time
import uuid

from flask import Blueprint, jsonify, request

from ..repositories import profile_repo
from ..security.image_validation import validate_image, reencode_image
from ..security.decorators import jwt_required, get_jwt, get_jwt_identity
from ..services import extraction_service, ingredient_service, cosmos_service
from ..services.personalization_service import personalize_ingredient, compute_verdict
from ..services.guidance_service import compute_guidance
from ..services.report_service import save_report

scans_bp = Blueprint("scans", __name__, url_prefix="/api")

# In-memory store for extraction results
_scan_cache: dict[str, dict] = {}


@scans_bp.route("/scans", methods=["POST"])
@jwt_required()
def upload_scan():
    """Upload a label image and return extracted data."""
    if "image" not in request.files:
        return jsonify({"error": {"code": "VALIDATION", "message": "No image file provided"}}), 400

    file = request.files["image"]
    image_data = file.read()

    # Validate
    is_valid, err_msg = validate_image(image_data)
    if not is_valid:
        return jsonify({"error": {"code": "VALIDATION", "message": err_msg}}), 400

    # Re-encode
    image_data = reencode_image(image_data)

    # Extract via Gemini
    try:
        result = extraction_service.extract_from_image(image_data)
    except Exception as e:
        return jsonify({"error": {"code": "EXTRACTION_FAILED", "message": str(e)}}), 500

    # Generate scan ID
    scan_id = uuid.uuid4().hex

    # Store in cache
    _scan_cache[scan_id] = result

    # Save raw response
    claims = get_jwt()
    user_identity = get_jwt_identity()
    cosmos_service.save_raw_response(scan_id, user_identity, result)

    return jsonify({
        "scan_id": scan_id,
        "extraction": result,
    })


@scans_bp.route("/scans/<scan_id>", methods=["PATCH"])
@jwt_required()
def update_scan(scan_id: str):
    """Update the extracted ingredients (user corrections)."""
    if scan_id not in _scan_cache:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "Scan not found"}}), 404

    data = request.get_json(silent=True) or {}
    if "ingredients" in data:
        _scan_cache[scan_id]["ingredients"] = data["ingredients"]
    if "product_name" in data:
        _scan_cache[scan_id]["product_name"] = data["product_name"]
    if "product_type" in data:
        _scan_cache[scan_id]["product_type"] = data["product_type"]

    return jsonify({"message": "Scan updated", "extraction": _scan_cache[scan_id]})


@scans_bp.route("/scans/<scan_id>/analyze", methods=["POST"])
@jwt_required()
def analyze_scan(scan_id: str):
    """Run analysis and return the report."""
    start_time = time.time()
    claims = get_jwt()
    role = claims.get("role", "guest")
    user_identity = get_jwt_identity()

    # Get extraction data
    extraction = _scan_cache.get(scan_id)
    if not extraction:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "Scan not found. Upload first."}}), 404

    # Accept overrides from body
    body = request.get_json(silent=True) or {}
    raw_ingredients = body.get("ingredients", extraction.get("ingredients", []))
    product_name = body.get("product_name", extraction.get("product_name", "Unknown Product"))
    product_type = body.get("product_type", extraction.get("product_type", "food"))

    # Profile data
    age_group = body.get("age_group", "adult")
    user_conditions = body.get("conditions", [])
    user_allergens = body.get("allergens", [])

    if role == "user":
        user_id = int(user_identity)
        profile = profile_repo.get_profile(user_id)
        if profile:
            age_group = profile.get("age_group_code", age_group)
            user_conditions = [c["code"] for c in profile.get("conditions", [])]
            user_allergens = [a["code"] for a in profile.get("allergens", [])]

    # 1. Resolve ingredients against SQLite
    known, unknown = ingredient_service.resolve_ingredients(raw_ingredients)

    # 2. Analyze unknowns via AI (if any)
    new_ingredients = ingredient_service.analyze_unknown_ingredients(unknown)
    all_ingredients = known + new_ingredients

    # 3. Personalize
    personalised = [
        personalize_ingredient(ing, age_group, user_conditions, user_allergens)
        for ing in all_ingredients
    ]

    # 4. Verdict
    verdict, score = compute_verdict(personalised)

    # 5. Build response
    pie_by_rating = {}
    pie_by_category = {}
    for ing in personalised:
        r = ing["personalised_rating"]
        pie_by_rating[r] = pie_by_rating.get(r, 0) + 1
        c = ing.get("category_name", "Other")
        pie_by_category[c] = pie_by_category.get(c, 0) + 1

    ingredient_reports = []
    for ing in personalised:
        ingredient_reports.append({
            "name": ing.get("name", ""),
            "category": ing.get("category_name", "Other"),
            "rating": ing["personalised_rating"],
            "uses": ing.get("uses"),
            "disadvantages": ing.get("disadvantages"),
            "reason": ing.get("reason"),
        })

    max_servings = None
    days_per_week = None
    guidance_basis = None

    # 6. Save report for logged-in users
    public_id = None
    if role == "user":
        user_id = int(user_identity)
        report = save_report(
            user_id=user_id,
            product_name=product_name or "Unknown Product",
            product_type=product_type,
            personalised_ingredients=personalised,
            verdict=verdict,
            overall_score=score,
            age_group_code=age_group,
            user_description=body.get("user_description"),
            max_servings_per_day=max_servings,
            days_per_week=days_per_week,
            guidance_basis=guidance_basis,
        )
        public_id = report["public_id"]

    # Clean up cache
    _scan_cache.pop(scan_id, None)

    duration_ms = int((time.time() - start_time) * 1000)

    return jsonify({
        "public_id": public_id,
        "product_name": product_name,
        "product_type": product_type,
        "verdict": verdict,
        "overall_score": score,
        "ingredients": ingredient_reports,
        "pie_by_rating": pie_by_rating,
        "pie_by_category": pie_by_category,
        "max_servings_per_day": max_servings,
        "days_per_week": days_per_week,
        "guidance_basis": guidance_basis,
        "duration_ms": duration_ms,
        "new_ingredients_count": len(new_ingredients),
        "disclaimer": "This is general information, not medical advice. Consult a healthcare professional for personalised dietary guidance.",
    })
