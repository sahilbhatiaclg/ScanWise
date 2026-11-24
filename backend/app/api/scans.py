"""
ScanWise — Scan API (upload image, review, analyze).
"""
import time
import uuid
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from ..repositories import profile_repo
from ..security.image_validation import validate_image, reencode_image
from ..security.decorators import jwt_required, get_jwt, get_jwt_identity
from ..services import extraction_service, ingredient_service, cosmos_service
from ..services.personalization_service import personalize_ingredient, compute_verdict
from ..services.report_service import save_report

scans_bp = Blueprint("scans", __name__, url_prefix="/api")

# Fast in-process cache backed by SQLite (cosmos_service) for serverless persistence
_scan_cache: dict[str, dict] = {}


def _get_scan(scan_id: str) -> dict | None:
    if scan_id in _scan_cache:
        return _scan_cache[scan_id]
    stored = cosmos_service.get_raw_response(scan_id)
    if stored:
        _scan_cache[scan_id] = stored
    return stored


def _save_scan(scan_id: str, user_identity: str | None, data: dict):
    _scan_cache[scan_id] = data
    cosmos_service.save_raw_response(scan_id, user_identity, data)


@scans_bp.route("/scans", methods=["POST"])
@jwt_required()
def upload_scan():
    """Upload a label image and return extracted data."""
    if "image" not in request.files:
        return jsonify({"error": {"code": "VALIDATION", "message": "No image file provided"}}), 400

    file = request.files["image"]
    image_data = file.read()

    is_valid, err_msg = validate_image(image_data)
    if not is_valid:
        return jsonify({"error": {"code": "VALIDATION", "message": err_msg}}), 400

    image_data = reencode_image(image_data)

    try:
        result = extraction_service.extract_from_image(image_data)
    except Exception as e:
        return jsonify({"error": {"code": "EXTRACTION_FAILED", "message": str(e)}}), 500

    scan_id = uuid.uuid4().hex
    user_identity = get_jwt_identity()
    _save_scan(scan_id, user_identity, result)

    # Return both top-level fields (for frontend ReviewExtracted) and nested extraction (for API clients)
    return jsonify({
        "scan_id": scan_id,
        "product_name": result.get("product_name"),
        "product_type": result.get("product_type", "food"),
        "category": result.get("category") or result.get("product_type", "food"),
        "ingredients": result.get("ingredients", []),
        "nutrition": result.get("nutrition"),
        "allergen_statement": result.get("allergen_statement"),
        "warnings": result.get("warnings"),
        "confidence": result.get("confidence", 0.9),
        "extraction": result,
    })


@scans_bp.route("/scans/<scan_id>", methods=["PATCH"])
@jwt_required()
def update_scan(scan_id: str):
    """Update the extracted ingredients (user corrections)."""
    scan_data = _get_scan(scan_id)
    if not scan_data:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "Scan not found"}}), 404

    data = request.get_json(silent=True) or {}
    if "ingredients" in data:
        scan_data["ingredients"] = data["ingredients"]
    if "product_name" in data:
        scan_data["product_name"] = data["product_name"]
    if "product_type" in data:
        scan_data["product_type"] = data["product_type"]
        scan_data["category"] = data["product_type"]
    if "category" in data:
        scan_data["category"] = data["category"]
        scan_data["product_type"] = data["category"]

    _save_scan(scan_id, get_jwt_identity(), scan_data)

    return jsonify({
        "scan_id": scan_id,
        "product_name": scan_data.get("product_name"),
        "product_type": scan_data.get("product_type", "food"),
        "category": scan_data.get("category") or scan_data.get("product_type", "food"),
        "ingredients": scan_data.get("ingredients", []),
        "confidence": scan_data.get("confidence", 0.9),
        "message": "Scan updated",
        "extraction": scan_data,
    })


@scans_bp.route("/scans/<scan_id>/analyze", methods=["POST"])
@jwt_required()
def analyze_scan(scan_id: str):
    """Run analysis and return the report."""
    start_time = time.time()
    claims = get_jwt()
    role = claims.get("role", "guest")
    user_identity = get_jwt_identity()

    body = request.get_json(silent=True) or {}
    extraction = _get_scan(scan_id)
    if not extraction and not body.get("ingredients"):
        return jsonify({"error": {"code": "NOT_FOUND", "message": "Scan not found. Upload first."}}), 404
    extraction = extraction or {}

    raw_ingredients = body.get("ingredients", extraction.get("ingredients", []))
    product_name = body.get("product_name", extraction.get("product_name") or "Unknown Product")
    product_type = body.get("product_type") or body.get("category") or extraction.get("product_type", "food")

    # Support both nested guest_profile (from frontend) and flat fields
    guest_profile = body.get("guest_profile") or {}
    age_group = guest_profile.get("age_group") or body.get("age_group", "adult")
    user_conditions = guest_profile.get("conditions") or body.get("conditions", [])
    user_allergens = guest_profile.get("allergens") or body.get("allergens", [])

    if role == "user":
        user_id = int(user_identity)
        profile = profile_repo.get_profile(user_id)
        if profile:
            age_group = profile.get("age_group_code", age_group)
            user_conditions = [c["code"] for c in profile.get("conditions", [])]
            user_allergens = [a["code"] for a in profile.get("allergens", [])]

    # 1. Resolve ingredients against SQLite
    known, unknown = ingredient_service.resolve_ingredients(raw_ingredients)

    # 2. Analyze unknowns via Gemini AI (if any)
    new_ingredients = ingredient_service.analyze_unknown_ingredients(unknown)
    all_ingredients = known + new_ingredients

    # 3. Personalize
    personalised = [
        personalize_ingredient(ing, age_group, user_conditions, user_allergens)
        for ing in all_ingredients
    ]

    # 4. Verdict
    verdict, score = compute_verdict(personalised)

    # 5. Build frontend-compatible breakdown & guidance
    safe_count = 0
    adjustable_count = 0
    risk_count = 0
    category_counts: dict[str, int] = {}

    for ing in personalised:
        r = ing["personalised_rating"]
        if r == "safe":
            safe_count += 1
        elif r == "risk":
            risk_count += 1
        else:
            adjustable_count += 1
        c = ing.get("category_name", "Other")
        category_counts[c] = category_counts.get(c, 0) + 1

    categories_list = [
        {"category": k, "count": v}
        for k, v in sorted(category_counts.items(), key=lambda x: -x[1])
    ]

    ingredient_reports = []
    for ing in personalised:
        ingredient_reports.append({
            "ingredient_id": ing.get("ingredient_id"),
            "name": ing.get("name", ""),
            "category": ing.get("category_name", "Other"),
            "rating": ing["personalised_rating"],
            "severity": ing.get("personalised_severity", 1),
            "uses": ing.get("uses"),
            "disadvantages": ing.get("disadvantages"),
            "reason": ing.get("reason") or (
                f"Rated {ing['personalised_rating']} for {age_group} profile."
            ),
        })

    if verdict == "good":
        summary_reason = "Most ingredients are well-tolerated for your selected profile."
    elif verdict == "avoid":
        summary_reason = f"Contains {risk_count} high-risk ingredient(s) flagged for your profile."
    else:
        summary_reason = "Okay in moderation; watch flagged adjustable or risk ingredients."

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

    _scan_cache.pop(scan_id, None)
    duration_ms = int((time.time() - start_time) * 1000)

    return jsonify({
        "report_id": public_id,
        "public_id": public_id,
        "product_name": product_name,
        "product_type": product_type,
        "verdict": verdict,
        "overall_score": score,
        "summary_reason": summary_reason,
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ingredients": ingredient_reports,
        "breakdown": {
            "safe_count": safe_count,
            "adjustable_count": adjustable_count,
            "risk_count": risk_count,
            "categories": categories_list,
        },
        "guidance": {
            "max_servings_per_day": max_servings,
            "days_per_week": days_per_week,
            "guidance_basis": guidance_basis,
        } if max_servings is not None else None,
        "pie_by_rating": {
            "safe": safe_count,
            "adjustable": adjustable_count,
            "risk": risk_count,
        },
        "pie_by_category": category_counts,
        "duration_ms": duration_ms,
        "new_ingredients_count": len(new_ingredients),
        "disclaimer": "This is general information, not medical advice. Consult a healthcare professional for personalised dietary guidance.",
    })
