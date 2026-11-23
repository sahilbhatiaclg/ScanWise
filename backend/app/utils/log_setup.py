"""
ScanWise — Logging setup.

Simple structured logging to stdout. No Azure dependencies.
"""
import logging
import sys


def setup_logging(level: str = "INFO"):
    """Configure root logger with a simple format."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("[%(asctime)s] %(levelname)s %(name)s: %(message)s")
    )
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    root.addHandler(handler)
