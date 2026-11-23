"""
ScanWise — Test fixtures.
"""
import os
import sys
import tempfile

import pytest

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import create_app
from app.db import get_db, init_db


@pytest.fixture
def app():
    """Create application for testing with an in-memory SQLite database."""
    app = create_app("testing")

    with app.app_context():
        init_db(app)

    yield app


@pytest.fixture
def client(app):
    """Test client."""
    return app.test_client()


@pytest.fixture
def db(app):
    """Database connection."""
    with app.app_context():
        yield get_db()


@pytest.fixture
def auth_headers(client):
    """Get auth headers for a test user."""
    # Request OTP
    client.post("/api/auth/otp/request", json={"phone_number": "9999999999"})

    # Verify OTP (dev mode: 123456)
    resp = client.post("/api/auth/otp/verify", json={
        "phone_number": "9999999999",
        "otp": "123456",
        "consent": True,
    })
    data = resp.get_json()
    return {"Authorization": f"Bearer {data['access_token']}"}


@pytest.fixture
def guest_headers(client):
    """Get auth headers for a guest."""
    resp = client.post("/api/auth/guest")
    data = resp.get_json()
    return {"Authorization": f"Bearer {data['access_token']}"}
