"""
Vercel Serverless Function entry point for ScanWise Flask Backend.
"""
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "backend"))

from app import create_app

app = create_app()
