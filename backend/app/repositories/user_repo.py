"""
ScanWise — User repository (SQLite).
"""
from ..db import get_db


def find_by_phone(phone: str) -> dict | None:
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE phone_number = ?", (phone,)).fetchone()
    return dict(row) if row else None


def find_by_id(user_id: int) -> dict | None:
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def create_user(phone: str, consented_at: str) -> int:
    db = get_db()
    db.execute(
        "INSERT INTO users (phone_number, consented_at) VALUES (?, ?)",
        (phone, consented_at),
    )
    db.commit()
    return db.execute("SELECT last_insert_rowid()").fetchone()[0]


def update_last_login(user_id: int, timestamp: str):
    db = get_db()
    db.execute("UPDATE users SET last_login_at = ? WHERE user_id = ?", (timestamp, user_id))
    db.commit()


def delete_user(user_id: int):
    db = get_db()
    db.execute("DELETE FROM users WHERE user_id = ?", (user_id,))
    db.commit()
