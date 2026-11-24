"""
ScanWise — Raw AI response store (SQLite).

Stores per-scan extraction payloads in SQLite so they survive across
serverless function invocations (e.g. Vercel).
"""
import json

from ..db import get_db


def _ensure_table():
    """Create the ai_responses table if it doesn't exist."""
    db = get_db()
    db.execute("""
        CREATE TABLE IF NOT EXISTS ai_responses (
            response_id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id     TEXT NOT NULL,
            user_id     TEXT,
            response    TEXT NOT NULL,
            created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )
    """)
    db.commit()


def save_raw_response(scan_id: str, user_id: str | None, raw_json: dict):
    """Save or update the raw AI response for a scan."""
    _ensure_table()
    db = get_db()
    existing = db.execute(
        "SELECT response_id FROM ai_responses WHERE scan_id = ?",
        (scan_id,),
    ).fetchone()
    if existing:
        db.execute(
            "UPDATE ai_responses SET response = ? WHERE scan_id = ?",
            (json.dumps(raw_json), scan_id),
        )
    else:
        db.execute(
            "INSERT INTO ai_responses (scan_id, user_id, response) VALUES (?, ?, ?)",
            (scan_id, user_id, json.dumps(raw_json)),
        )
    db.commit()


def get_raw_response(scan_id: str) -> dict | None:
    """Retrieve a saved AI response."""
    _ensure_table()
    db = get_db()
    row = db.execute(
        "SELECT response FROM ai_responses WHERE scan_id = ? ORDER BY response_id DESC LIMIT 1",
        (scan_id,),
    ).fetchone()
    if row:
        return json.loads(row["response"])
    return None
