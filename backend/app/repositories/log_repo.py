"""
ScanWise — Audit / operations log repository (SQLite).
"""
from ..db import get_db


def log_action(user_id: int | None, action: str, entity_type: str | None = None,
               entity_id: int | None = None, details: str | None = None):
    db = get_db()
    db.execute(
        """INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
           VALUES (?, ?, ?, ?, ?)""",
        (user_id, action, entity_type, entity_id, details),
    )
    db.commit()


def log_scan_event(actor_role: str, duration_ms: int, product_type_id: int | None = None,
                   product_id: int | None = None, age_group_id: int | None = None,
                   verdict: str | None = None, cache_hit: bool = False,
                   new_ingredient_count: int = 0):
    db = get_db()
    db.execute(
        """INSERT INTO scan_events
           (actor_role, product_type_id, product_id, age_group_id, verdict,
            duration_ms, cache_hit, new_ingredient_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (actor_role, product_type_id, product_id, age_group_id, verdict,
         duration_ms, 1 if cache_hit else 0, new_ingredient_count),
    )
    db.commit()
