"""
ScanWise — WSGI entry point.
"""
import os
import sys
from pathlib import Path

# Ensure backend directory is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
