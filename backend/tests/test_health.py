"""
ScanWise — Health endpoint test.
"""


class TestHealth:
    def test_health_check(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "ok"
        assert data["ingredients_loaded"] == 100
