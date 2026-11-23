"""
ScanWise — End-to-End API Integration Tests.
"""
import os
import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app import create_app
from app.db import init_db


class TestScanWiseAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app("testing")
        cls.app_context = cls.app.app_context()
        cls.app_context.push()
        init_db(cls.app)
        cls.client = cls.app.test_client()

    @classmethod
    def tearDownClass(cls):
        cls.app_context.pop()
        db_file = cls.app.config["DATABASE"]
        if os.path.exists(db_file):
            try:
                os.remove(db_file)
            except OSError:
                pass

    def test_01_health_check(self):
        """GET /api/health returns ok and loaded ingredient count (100)."""
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["ingredients_loaded"], 100)

    def test_02_guest_auth(self):
        """POST /api/auth/guest returns a valid guest token."""
        resp = self.client.post("/api/auth/guest")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertIn("access_token", data)
        self.assertEqual(data["role"], "guest")

    def test_03_otp_flow(self):
        """Request and verify OTP to obtain user JWT."""
        # 1. Request OTP
        req_resp = self.client.post("/api/auth/otp/request", json={"phone_number": "9876543210"})
        self.assertEqual(req_resp.status_code, 200)
        otp = req_resp.get_json().get("dev_otp", "123456")

        # 2. Verify OTP
        verify_resp = self.client.post("/api/auth/otp/verify", json={
            "phone_number": "9876543210",
            "otp": otp,
        })
        self.assertEqual(verify_resp.status_code, 200)
        data = verify_resp.get_json()
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)
        self.assertIsNotNone(data["user_id"])

    def test_04_profile_crud(self):
        """Profile setup and retrieval for authenticated user."""
        # Request & verify OTP
        self.client.post("/api/auth/otp/request", json={"phone_number": "9876543210"})
        verify_resp = self.client.post("/api/auth/otp/verify", json={
            "phone_number": "9876543210",
            "otp": "123456",
        })
        token = verify_resp.get_json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Update profile
        put_resp = self.client.put("/api/profile", headers=headers, json={
            "age_group": "adult",
            "skin_type": "combination",
            "dietary_preference": "vegetarian",
            "conditions": ["diabetes", "hypertension"],
            "allergens": ["peanut"],
        })
        self.assertEqual(put_resp.status_code, 200)

        # Get profile
        get_resp = self.client.get("/api/profile", headers=headers)
        self.assertEqual(get_resp.status_code, 200)
        pdata = get_resp.get_json()
        self.assertEqual(pdata["age_group"], "adult")
        conds = [c["code"] for c in pdata["conditions"]]
        self.assertIn("diabetes", conds)


if __name__ == "__main__":
    unittest.main(verbosity=2)
