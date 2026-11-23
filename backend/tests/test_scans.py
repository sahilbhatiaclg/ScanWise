"""
ScanWise — Scan API tests.
"""


class TestScans:
    def test_scan_requires_auth(self, client):
        resp = client.post("/api/scans")
        assert resp.status_code == 401

    def test_scan_no_image(self, client, auth_headers):
        resp = client.post("/api/scans", headers=auth_headers)
        assert resp.status_code == 400
