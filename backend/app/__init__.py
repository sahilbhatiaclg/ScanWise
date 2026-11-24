"""
ScanWise — Flask application factory.
"""
import os
from flask import Flask

from .config import config_by_name
from .db import close_db, init_db
from .extensions import init_app_middleware


def create_app(config_name: str | None = None) -> Flask:
    """Create and configure the Flask app."""
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_by_name.get(config_name, config_by_name["development"]))

    # Ensure instance folder exists (skip on read-only serverless filesystems like Vercel)
    try:
        os.makedirs(app.instance_path, exist_ok=True)
    except OSError:
        pass

    # Middleware (CORS + Security headers)
    init_app_middleware(app)

    # Register teardown
    app.teardown_appcontext(close_db)

    # Register blueprints
    from .api.health import health_bp
    from .api.auth import auth_bp
    from .api.scans import scans_bp
    from .api.reports import reports_bp
    from .api.profile import profile_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(scans_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(profile_bp)

    # Initialize tables and seed automatically
    with app.app_context():
        init_db(app)

    return app
