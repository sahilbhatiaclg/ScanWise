"""
ScanWise — Auth API tests.
"""


class TestGuestAuth:
    def test_guest_login(self, client):
        resp = client.post("/api/auth/guest")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "access_token" in data
        assert data["role"] == "guest"


class TestOtpAuth:
    def test_request_otp(self, client):
        resp = client.post("/api/auth/otp/request", json={"phone_number": "9876543210"})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["dev_otp"] == "123456"

    def test_verify_otp_success(self, client):
        # Request
        client.post("/api/auth/otp/request", json={"phone_number": "9876543210"})
        # Verify
        resp = client.post("/api/auth/otp/verify", json={
            "phone_number": "9876543210",
            "otp": "123456",
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert "access_token" in data
        assert data["user_id"] is not None

    def test_verify_otp_wrong(self, client):
        client.post("/api/auth/otp/request", json={"phone_number": "9876543210"})
        resp = client.post("/api/auth/otp/verify", json={
            "phone_number": "9876543210",
            "otp": "000000",
        })
        assert resp.status_code == 401

    def test_verify_otp_creates_new_user(self, client):
        client.post("/api/auth/otp/request", json={"phone_number": "1111111111"})
        resp = client.post("/api/auth/otp/verify", json={
            "phone_number": "1111111111",
            "otp": "123456",
        })
        data = resp.get_json()
        assert data["is_new"] is True

    def test_request_otp_missing_phone(self, client):
        resp = client.post("/api/auth/otp/request", json={})
        assert resp.status_code == 400
