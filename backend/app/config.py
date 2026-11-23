"""
ScanWise — Application configuration.

Loads settings from environment variables (via .env) with sensible defaults
for local development. No Azure dependencies.
"""
import os
import tempfile
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend directory
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)


class Config:
    """Base configuration."""

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    DEBUG = False
    TESTING = False

    # Database — SQLite file inside instance/
    DATABASE = os.getenv("DATABASE_PATH", None)

    # JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-dev-secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "900"))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        seconds=int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", "2592000"))
    )

    # Gemini AI
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    DATABASE = os.path.join(tempfile.gettempdir(), "scanwise_test.db")
    JWT_SECRET_KEY = "test-secret"
    SECRET_KEY = "test-secret"


class ProductionConfig(Config):
    DEBUG = False


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
