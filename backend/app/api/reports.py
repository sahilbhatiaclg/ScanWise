"""
ScanWise — Reports API (list, detail, delete).
"""
from flask import Blueprint, jsonify, request

from ..repositories import report_repo
from ..security.decorators import jwt_required, role_required, get_jwt_identity

reports_bp = Blueprint("reports", __name__, url_prefix="/api")


@reports_bp.route("/reports", methods=["GET"])
@jwt_required()
@role_required("user")
def list_reports():
    """List the user's reports (paged)."""
    user_id = int(get_jwt_identity())
    page = request.args.get("page", 1, type=int)
    page_size = request.args.get("page_size", 10, type=int)

    reports = report_repo.get_user_reports(user_id, page, page_size)
    return jsonify({"reports": reports, "page": page, "page_size": page_size})


@reports_bp.route("/reports/<public_id>", methods=["GET"])
@jwt_required()
@role_required("user")
def get_report(public_id: str):
    """Get one full report by public_id."""
    user_id = int(get_jwt_identity())
    report = report_repo.get_report_by_public_id(public_id, user_id)
    if not report:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "Report not found"}}), 404
    return jsonify(report)


@reports_bp.route("/reports/<public_id>", methods=["DELETE"])
@jwt_required()
@role_required("user")
def delete_report(public_id: str):
    """Delete a report."""
    user_id = int(get_jwt_identity())
    deleted = report_repo.delete_report(public_id, user_id)
    if not deleted:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "Report not found"}}), 404
    return jsonify({"message": "Report deleted"})
