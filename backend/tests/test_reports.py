"""
ScanWise — Reports API tests.
"""


class TestReports:
    def test_list_reports_requires_auth(self, client):
        resp = client.get("/api/reports")
        assert resp.status_code == 401

    def test_list_reports_guest_forbidden(self, client, guest_headers):
        resp = client.get("/api/reports", headers=guest_headers)
        assert resp.status_code == 403

    def test_list_reports_empty(self, client, auth_headers):
        resp = client.get("/api/reports", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["reports"] == []

    def test_get_nonexistent_report(self, client, auth_headers):
        resp = client.get("/api/reports/nonexistent", headers=auth_headers)
        assert resp.status_code == 404
