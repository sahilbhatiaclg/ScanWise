"""
ScanWise — Centralised error helpers.
"""
from flask import jsonify


class AppError(Exception):
    """Application-level error with an HTTP status code."""

    def __init__(self, message: str, code: str = "ERROR", status: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status

    def to_response(self):
        return jsonify({"error": {"code": self.code, "message": self.message}}), self.status


def register_error_handlers(app):
    """Attach JSON error handlers to the Flask app."""

    @app.errorhandler(AppError)
    def handle_app_error(e):
        return e.to_response()

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": {"code": "NOT_FOUND", "message": "Resource not found"}}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": {"code": "SERVER_ERROR", "message": "Internal server error"}}), 500
