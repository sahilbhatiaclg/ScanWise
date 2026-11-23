"""
ScanWise — Cosmos DB service (REPLACED).

This module previously used Azure Cosmos DB to store raw AI responses.
In the SQLite-only version, raw AI responses are stored as JSON in a
simple SQLite table, keeping the same interface.
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
    """Save the raw AI response for a scan."""
    _ensure_table()
    db = get_db()
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
        "SELECT response FROM ai_responses WHERE scan_id = ? ORDER BY created_at DESC LIMIT 1",
        (scan_id,),
    ).fetchone()
    if row:
        return json.loads(row["response"])
    return None
