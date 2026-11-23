"""
ScanWise — Lightweight auth and security utilities using standard PyJWT and Flask.
Zero external extensions required — completely self-contained.
"""
from functools import wraps
from datetime import datetime, timedelta, timezone
from flask import g, request, jsonify, current_app
import jwt


def get_jwt_identity():
    """Return the identity from the verified token in current request."""
    return getattr(g, "jwt_identity", None)


def get_jwt():
    """Return the decoded JWT claims in current request."""
    return getattr(g, "jwt_claims", {})


def verify_token(token: str, secret: str = None) -> dict:
    """Decode and verify a JWT token."""
    if secret is None:
        secret = current_app.config.get("JWT_SECRET_KEY", "dev-secret-jwt")
    return jwt.decode(token, secret, algorithms=["HS256"])


def jwt_required(optional: bool = False, refresh: bool = False):
    """Decorator ensuring a valid JWT is present in Authorization header."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header or not auth_header.startswith("Bearer "):
                if optional:
                    g.jwt_identity = None
                    g.jwt_claims = {}
                    return fn(*args, **kwargs)
                return jsonify({"error": {"code": "UNAUTHORIZED", "message": "Missing Bearer token"}}), 401

            token = auth_header.split(" ", 1)[1].strip()
            secret = current_app.config.get("JWT_SECRET_KEY", "dev-secret-jwt")
            try:
                payload = jwt.decode(token, secret, algorithms=["HS256"])
                if refresh and payload.get("type") != "refresh":
                    return jsonify({"error": {"code": "INVALID_TOKEN", "message": "Refresh token required"}}), 401
                if not refresh and payload.get("type") == "refresh":
                    return jsonify({"error": {"code": "INVALID_TOKEN", "message": "Access token required"}}), 401
                g.jwt_identity = payload.get("sub")
                g.jwt_claims = payload
            except jwt.ExpiredSignatureError:
                return jsonify({"error": {"code": "TOKEN_EXPIRED", "message": "Token has expired"}}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": {"code": "INVALID_TOKEN", "message": "Invalid token"}}), 401

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def role_required(*allowed_roles):
    """Decorator checking that the caller's JWT has one of the allowed roles."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            role = claims.get("role", "guest")
            if role not in allowed_roles:
                return jsonify({"error": {"code": "FORBIDDEN", "message": "Insufficient permissions"}}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
