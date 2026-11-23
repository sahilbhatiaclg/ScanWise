"""
ScanWise — Profile repository (SQLite).
"""
from ..db import get_db


def get_profile(user_id: int) -> dict | None:
    db = get_db()
    row = db.execute(
        """SELECT up.*, ag.code AS age_group_code, ag.label AS age_group_label,
                  st.code AS skin_type_code, dp.code AS dietary_code
           FROM user_profiles up
           JOIN age_groups ag ON ag.age_group_id = up.age_group_id
           LEFT JOIN skin_types st ON st.skin_type_id = up.skin_type_id
           LEFT JOIN dietary_preferences dp ON dp.dietary_preference_id = up.dietary_preference_id
           WHERE up.user_id = ?""",
        (user_id,),
    ).fetchone()
    if not row:
        return None
    profile = dict(row)

    # Conditions
    conditions = db.execute(
        """SELECT hc.code, hc.name
           FROM user_conditions uc
           JOIN health_conditions hc ON hc.condition_id = uc.condition_id
           WHERE uc.user_id = ?""",
        (user_id,),
    ).fetchall()
    profile["conditions"] = [dict(c) for c in conditions]

    # Allergens
    allergens = db.execute(
        """SELECT a.code, a.name
           FROM user_allergens ua
           JOIN allergens a ON a.allergen_id = ua.allergen_id
           WHERE ua.user_id = ?""",
        (user_id,),
    ).fetchall()
    profile["allergens"] = [dict(a) for a in allergens]

    return profile


def upsert_profile(user_id: int, age_group_code: str, skin_type_code: str | None = None,
                    dietary_code: str | None = None, condition_codes: list[str] | None = None,
                    allergen_codes: list[str] | None = None):
    db = get_db()

    ag = db.execute("SELECT age_group_id FROM age_groups WHERE code = ?", (age_group_code,)).fetchone()
    if not ag:
        raise ValueError(f"Unknown age group: {age_group_code}")

    skin_id = None
    if skin_type_code:
        st = db.execute("SELECT skin_type_id FROM skin_types WHERE code = ?", (skin_type_code,)).fetchone()
        skin_id = st["skin_type_id"] if st else None

    diet_id = None
    if dietary_code:
        dp = db.execute("SELECT dietary_preference_id FROM dietary_preferences WHERE code = ?", (dietary_code,)).fetchone()
        diet_id = dp["dietary_preference_id"] if dp else None

    # Upsert profile
    existing = db.execute("SELECT 1 FROM user_profiles WHERE user_id = ?", (user_id,)).fetchone()
    if existing:
        db.execute(
            """UPDATE user_profiles
               SET age_group_id = ?, skin_type_id = ?, dietary_preference_id = ?,
                   updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
               WHERE user_id = ?""",
            (ag["age_group_id"], skin_id, diet_id, user_id),
        )
    else:
        db.execute(
            """INSERT INTO user_profiles (user_id, age_group_id, skin_type_id, dietary_preference_id)
               VALUES (?, ?, ?, ?)""",
            (user_id, ag["age_group_id"], skin_id, diet_id),
        )

    # Conditions
    db.execute("DELETE FROM user_conditions WHERE user_id = ?", (user_id,))
    for code in (condition_codes or []):
        cond = db.execute("SELECT condition_id FROM health_conditions WHERE code = ?", (code,)).fetchone()
        if cond:
            db.execute(
                "INSERT INTO user_conditions (user_id, condition_id) VALUES (?, ?)",
                (user_id, cond["condition_id"]),
            )

    # Allergens
    db.execute("DELETE FROM user_allergens WHERE user_id = ?", (user_id,))
    for code in (allergen_codes or []):
        alg = db.execute("SELECT allergen_id FROM allergens WHERE code = ?", (code,)).fetchone()
        if alg:
            db.execute(
                "INSERT INTO user_allergens (user_id, allergen_id) VALUES (?, ?)",
                (user_id, alg["allergen_id"]),
            )

    db.commit()
