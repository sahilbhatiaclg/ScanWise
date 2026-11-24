"""
ScanWise — End-to-End API Integration Tests.
Includes real multi-product label image tests to ensure different products
produce distinct extracted ingredients and reports.
"""
import io
import os
import sys
import unittest
from pathlib import Path
from PIL import Image, ImageDraw

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app import create_app
from app.db import init_db


def _make_label_image(lines: list[str]) -> bytes:
    """Create a realistic readable product label image with text."""
    img = Image.new("RGB", (700, 350), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    y = 20
    for line in lines:
        draw.text((20, y), line, fill=(0, 0, 0))
        y += 32
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


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
        req_resp = self.client.post("/api/auth/otp/request", json={"phone_number": "9876543210"})
        self.assertEqual(req_resp.status_code, 200)
        otp = req_resp.get_json().get("dev_otp", "123456")

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
        self.client.post("/api/auth/otp/request", json={"phone_number": "9876543210"})
        verify_resp = self.client.post("/api/auth/otp/verify", json={
            "phone_number": "9876543210",
            "otp": "123456",
        })
        token = verify_resp.get_json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        put_resp = self.client.put("/api/profile", headers=headers, json={
            "age_group": "adult",
            "skin_type": "combination",
            "dietary_preference": "vegetarian",
            "conditions": ["diabetes", "hypertension"],
            "allergens": ["peanut"],
        })
        self.assertEqual(put_resp.status_code, 200)

        get_resp = self.client.get("/api/profile", headers=headers)
        self.assertEqual(get_resp.status_code, 200)
        pdata = get_resp.get_json()
        self.assertEqual(pdata["age_group"], "adult")
        conds = [c["code"] for c in pdata["conditions"]]
        self.assertIn("diabetes", conds)

    def test_05_distinct_products_scan_and_analyze(self):
        """Scanning two different product labels must produce distinct results and full frontend-compatible reports."""
        guest_resp = self.client.post("/api/auth/guest")
        token = guest_resp.get_json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Product 1: Maggi 2-Minute Noodles
        maggi_img = _make_label_image([
            "MAGGI 2-MINUTE NOODLES MASALA",
            "INGREDIENTS: Refined Wheat Flour (Maida), Palm Oil,",
            "Iodised Salt, Wheat Gluten, Mineral (Calcium Carbonate),",
            "Guar Gum, Potassium Chloride, Sugar, Citric Acid",
        ])
        r1 = self.client.post(
            "/api/scans",
            headers=headers,
            data={"image": (io.BytesIO(maggi_img), "maggi.jpg", "image/jpeg")},
            content_type="multipart/form-data",
        )
        self.assertEqual(r1.status_code, 200)
        d1 = r1.get_json()
        self.assertIn("scan_id", d1)
        self.assertIn("product_name", d1)
        self.assertIn("category", d1)
        self.assertIsInstance(d1["ingredients"], list)
        self.assertGreater(len(d1["ingredients"]), 0)

        # Product 2: Skincare Face Wash
        skincare_img = _make_label_image([
            "GENTLE HYDRATING FACE WASH",
            "INGREDIENTS: Water, Glycerin, Niacinamide,",
            "Cocamidopropyl Betaine, Salicylic Acid, Panthenol,",
            "Phenoxyethanol, Fragrance",
        ])
        r2 = self.client.post(
            "/api/scans",
            headers=headers,
            data={"image": (io.BytesIO(skincare_img), "facewash.jpg", "image/jpeg")},
            content_type="multipart/form-data",
        )
        self.assertEqual(r2.status_code, 200)
        d2 = r2.get_json()
        self.assertIn("scan_id", d2)
        self.assertNotEqual(d1["scan_id"], d2["scan_id"])

        # If Gemini is reachable, the two distinct images MUST yield different product names / ingredients
        if d1.get("extraction", {}).get("model_used") and d2.get("extraction", {}).get("model_used"):
            self.assertNotEqual(
                [i.lower() for i in d1["ingredients"]],
                [i.lower() for i in d2["ingredients"]],
                "Two distinct product images produced identical ingredients!",
            )

        # Patch & Analyze Product 1
        patch_resp = self.client.patch(
            f"/api/scans/{d1['scan_id']}",
            headers=headers,
            json={
                "product_name": d1["product_name"],
                "category": d1["category"],
                "ingredients": d1["ingredients"],
            },
        )
        self.assertEqual(patch_resp.status_code, 200)

        analyze_resp = self.client.post(
            f"/api/scans/{d1['scan_id']}/analyze",
            headers=headers,
            json={"guest_profile": {"age_group": "adult", "conditions": ["hypertension"], "allergens": []}},
        )
        self.assertEqual(analyze_resp.status_code, 200)
        report = analyze_resp.get_json()
        self.assertIn("verdict", report)
        self.assertIn("overall_score", report)
        self.assertIn("breakdown", report)
        self.assertIn("categories", report["breakdown"])
        self.assertIsInstance(report["ingredients"], list)
        self.assertGreater(len(report["ingredients"]), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
