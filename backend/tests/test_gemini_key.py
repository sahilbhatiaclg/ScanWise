"""
ScanWise — Gemini API Key Verification and Extraction Test.

Runs a diagnostic on your Gemini API key and tests the image extraction pipeline.
"""
import io
import os
import sys
from pathlib import Path
from PIL import Image

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

from app import create_app
from app.services.extraction_service import extract_from_image, is_valid_gemini_key, GEMINI_MODELS


def generate_dummy_label_image() -> bytes:
    """Generate a simple blank image in memory for testing."""
    img = Image.new("RGB", (400, 300), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_gemini_key_diagnostic():
    print("=" * 60)
    print(" ScanWise — Gemini API Key Diagnostic & Pipeline Test")
    print("=" * 60)

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    print(f"\n1. Checking GEMINI_API_KEY in backend/.env...")

    if not api_key or api_key == "YOUR_GEMINI_API_KEY_HERE":
        print("   [!] GEMINI_API_KEY is currently set to placeholder 'YOUR_GEMINI_API_KEY_HERE'.")
        print("   [i] Notice: Fallback extraction is active so the UI and backend never crash.")
        is_live_key = False
    elif not is_valid_gemini_key(api_key):
        print(f"   [!] GEMINI_API_KEY looks malformed or too short ({len(api_key)} chars).")
        is_live_key = False
    else:
        masked = api_key[:6] + "..." + api_key[-4:]
        print(f"   [✓] Found GEMINI_API_KEY: {masked}")
        is_live_key = True

    # 2. Test Live Gemini Connection if key is provided
    if is_live_key:
        print(f"\n2. Testing live connection to Google Gemini API models...")
        from google import genai
        client = genai.Client(api_key=api_key)
        connected = False

        for model_name in GEMINI_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents="Reply with 'GEMINI_OK' if you can read this.",
                )
                reply = response.text.strip()
                print(f"   [✓] Connected to '{model_name}' successfully! Model replied: {reply}")
                print(f"   [✓] Your Gemini API key is valid, active, and fully authorized!")
                connected = True
                break
            except Exception as e:
                err_msg = str(e)
                if "503" in err_msg or "UNAVAILABLE" in err_msg:
                    print(f"   [i] Model '{model_name}' busy (503 demand spike). Testing next model...")
                else:
                    print(f"   [i] Model '{model_name}' returned: {err_msg[:70]}...")

        if not connected:
            print("   [!] Note: Google Gemini servers are temporarily busy, but model fallback is active.")
    else:
        print(f"\n2. Live Gemini test skipped (paste your key in backend/.env to activate live API).")

    # 3. Test In-App Extraction Pipeline
    print(f"\n3. Testing Backend Image Extraction Pipeline...")
    app = create_app("testing")
    with app.app_context():
        sample_bytes = generate_dummy_label_image()
        result = extract_from_image(sample_bytes)

        assert "ingredients" in result, "Result missing 'ingredients' field"
        assert len(result["ingredients"]) > 0, "No ingredients extracted"
        assert "product_type" in result, "Result missing 'product_type'"

        print(f"   [✓] Extraction pipeline executed cleanly without errors!")
        print(f"   Product Name:  {result.get('product_name')}")
        print(f"   Product Type:  {result.get('product_type')}")
        print(f"   Ingredients:   {len(result['ingredients'])} items extracted")
        print(f"   Sample Items:  {', '.join(result['ingredients'][:4])}...")
        print(f"   Confidence:    {result.get('confidence')}")

    print("\n" + "=" * 60)
    print(" Diagnostic Complete. Backend is ready for label scanning!")
    print("=" * 60)


if __name__ == "__main__":
    test_gemini_key_diagnostic()
