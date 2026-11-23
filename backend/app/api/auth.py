"""
ScanWise — Auth API (login, OTP, guest, refresh, logout).
"""
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

from ..repositories import user_repo, log_repo
from ..services import otp_service, token_service
from ..security.decorators import jwt_required, get_jwt, get_jwt_identity

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/guest", methods=["POST"])
def guest_login():
    """Start a guest session. Returns a short-lived guest token."""
    access_token = token_service.issue_guest_token()
    log_repo.log_action(None, "GUEST_SESSION_STARTED")
    return jsonify({
        "access_token": access_token,
        "token_type": "bearer",
        "role": "guest",
    })


@auth_bp.route("/otp/request", methods=["POST"])
def request_otp():
    """Send an OTP to the given phone number."""
    data = request.get_json(silent=True) or {}
    phone = (data.get("phone_number") or "").strip()

    if not phone or len(phone) < 10:
        return jsonify({"error": {"code": "VALIDATION", "message": "Valid phone number required"}}), 400

    otp = otp_service.request_otp(phone)

    return jsonify({
        "message": "OTP sent successfully",
        "dev_otp": otp,
    })


@auth_bp.route("/otp/verify", methods=["POST"])
def verify_otp():
    """Verify OTP and return access + refresh tokens."""
    data = request.get_json(silent=True) or {}
    phone = (data.get("phone_number") or "").strip()
    otp = (data.get("otp") or "").strip()

    if not phone or not otp:
        return jsonify({"error": {"code": "VALIDATION", "message": "Phone and OTP required"}}), 400

    if not otp_service.verify_otp(phone, otp):
        return jsonify({"error": {"code": "INVALID_OTP", "message": "Invalid or expired OTP"}}), 401

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    user = user_repo.find_by_phone(phone)
    is_new = False
    if not user:
        user_id = user_repo.create_user(phone, consented_at=now)
        is_new = True
    else:
        user_id = user["user_id"]

    user_repo.update_last_login(user_id, now)
    tokens = token_service.issue_tokens(user_id, role="user")
    log_repo.log_action(user_id, "LOGIN", "user", user_id)

    return jsonify({
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer",
        "user_id": user_id,
        "is_new": is_new,
    })


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Issue a new access token from a refresh token."""
    identity = get_jwt_identity()
    claims = get_jwt()
    if claims.get("role") == "guest":
        access_token = token_service.issue_guest_token()
    else:
        access_token = token_service.issue_tokens(int(identity), role="user")["access_token"]

    return jsonify({
        "access_token": access_token,
        "token_type": "bearer",
    })


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    """Revoke the refresh token."""
    data = request.get_json(silent=True) or {}
    refresh_token = data.get("refresh_token")
    if refresh_token:
        token_service.revoke_refresh_token(refresh_token)

    identity = get_jwt_identity()
    if identity and identity != "guest":
        log_repo.log_action(int(identity), "LOGOUT")

    return jsonify({"message": "Logged out"})


@auth_bp.route("/account", methods=["DELETE"])
@jwt_required()
def delete_account():
    """Delete the user's account and all linked data."""
    claims = get_jwt()
    if claims.get("role") != "user":
        return jsonify({"error": {"code": "FORBIDDEN", "message": "Guests cannot delete accounts"}}), 403

    user_id = int(get_jwt_identity())
    log_repo.log_action(user_id, "ACCOUNT_DELETED", "user", user_id)
    user_repo.delete_user(user_id)
    return jsonify({"message": "Account deleted"})
