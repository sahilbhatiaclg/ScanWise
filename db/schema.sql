/* =====================================================================
   ScanWise - database schema (SQLite)
   Version 2.0 - Migrated from Azure SQL to SQLite for local/Vercel deployment
   ---------------------------------------------------------------------
   HOW TO RUN
   - Runs automatically when the Flask app starts (db.py calls init_db).
   - Can also be run manually: sqlite3 instance/scanwise.db < db/schema.sql
   SECTIONS
     1 Lookup tables
     2 Users and profiles
     3 Ingredient knowledge
     4 Products
     5 Reports
     6 Operations (OTP, tokens, audit, scan events)
     7 Staging table for the ingredient seed
     8 Indexes
     9 Lookup seed data
   ===================================================================== */

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

/* ---------- 1. Lookup tables ---------- */
CREATE TABLE IF NOT EXISTS roles (
    role_id   INTEGER NOT NULL PRIMARY KEY,
    code      TEXT    NOT NULL UNIQUE,
    label     TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS age_groups (
    age_group_id INTEGER NOT NULL PRIMARY KEY,
    code         TEXT    NOT NULL UNIQUE,
    label        TEXT    NOT NULL,
    min_age      INTEGER NOT NULL,
    max_age      INTEGER,
    CHECK (max_age IS NULL OR max_age >= min_age)
);

CREATE TABLE IF NOT EXISTS ratings (
    rating_id INTEGER NOT NULL PRIMARY KEY,
    code      TEXT    NOT NULL UNIQUE,
    label     TEXT    NOT NULL,
    severity  INTEGER NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS product_types (
    product_type_id INTEGER NOT NULL PRIMARY KEY,
    code            TEXT    NOT NULL UNIQUE,
    label           TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS ingredient_categories (
    category_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    code        TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS nutrients (
    nutrient_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    code        TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL,
    unit        TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS health_conditions (
    condition_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    code         TEXT    NOT NULL UNIQUE,
    name         TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS allergens (
    allergen_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    code        TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS skin_types (
    skin_type_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    code         TEXT    NOT NULL UNIQUE,
    name         TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS dietary_preferences (
    dietary_preference_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    code                  TEXT    NOT NULL UNIQUE,
    name                  TEXT    NOT NULL
);

/* ---------- 2. Users and profiles ---------- */
CREATE TABLE IF NOT EXISTS users (
    user_id       INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    role_id       INTEGER NOT NULL DEFAULT 1,
    phone_number  TEXT    NOT NULL UNIQUE,
    consented_at  TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    last_login_at TEXT,
    is_active     INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (role_id) REFERENCES roles (role_id)
);

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id               INTEGER NOT NULL PRIMARY KEY,
    age_group_id          INTEGER NOT NULL,
    skin_type_id          INTEGER,
    dietary_preference_id INTEGER,
    updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY (user_id)               REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (age_group_id)          REFERENCES age_groups (age_group_id),
    FOREIGN KEY (skin_type_id)          REFERENCES skin_types (skin_type_id),
    FOREIGN KEY (dietary_preference_id) REFERENCES dietary_preferences (dietary_preference_id)
);

CREATE TABLE IF NOT EXISTS user_conditions (
    user_id      INTEGER NOT NULL,
    condition_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, condition_id),
    FOREIGN KEY (user_id)      REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (condition_id) REFERENCES health_conditions (condition_id)
);

CREATE TABLE IF NOT EXISTS user_allergens (
    user_id     INTEGER NOT NULL,
    allergen_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, allergen_id),
    FOREIGN KEY (user_id)     REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (allergen_id) REFERENCES allergens (allergen_id)
);

/* ---------- 3. Ingredient knowledge (shared, no personal data) ---------- */
CREATE TABLE IF NOT EXISTS ingredients (
    ingredient_id   INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    normalized_name TEXT    NOT NULL UNIQUE,
    category_id     INTEGER NOT NULL,
    uses            TEXT,
    disadvantages   TEXT,
    base_rating_id  INTEGER NOT NULL,
    source          TEXT    NOT NULL CHECK (source IN ('seed', 'manual', 'ai')),
    is_reviewed     INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY (category_id)    REFERENCES ingredient_categories (category_id),
    FOREIGN KEY (base_rating_id) REFERENCES ratings (rating_id)
);

CREATE TABLE IF NOT EXISTS ingredient_aliases (
    alias_id         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    ingredient_id    INTEGER NOT NULL,
    alias_normalized TEXT    NOT NULL UNIQUE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ingredient_age_ratings (
    ingredient_id INTEGER NOT NULL,
    age_group_id  INTEGER NOT NULL,
    rating_id     INTEGER NOT NULL,
    note          TEXT,
    PRIMARY KEY (ingredient_id, age_group_id),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id) ON DELETE CASCADE,
    FOREIGN KEY (age_group_id)  REFERENCES age_groups (age_group_id),
    FOREIGN KEY (rating_id)     REFERENCES ratings (rating_id)
);

CREATE TABLE IF NOT EXISTS ingredient_allergens (
    ingredient_id INTEGER NOT NULL,
    allergen_id   INTEGER NOT NULL,
    PRIMARY KEY (ingredient_id, allergen_id),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id) ON DELETE CASCADE,
    FOREIGN KEY (allergen_id)   REFERENCES allergens (allergen_id)
);

CREATE TABLE IF NOT EXISTS ingredient_condition_risks (
    ingredient_id INTEGER NOT NULL,
    condition_id  INTEGER NOT NULL,
    rating_id     INTEGER NOT NULL,
    note          TEXT,
    PRIMARY KEY (ingredient_id, condition_id),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id) ON DELETE CASCADE,
    FOREIGN KEY (condition_id)  REFERENCES health_conditions (condition_id),
    FOREIGN KEY (rating_id)     REFERENCES ratings (rating_id)
);

CREATE TABLE IF NOT EXISTS age_group_limits (
    nutrient_id  INTEGER NOT NULL,
    age_group_id INTEGER NOT NULL,
    daily_limit  REAL    NOT NULL CHECK (daily_limit > 0),
    source_note  TEXT,
    PRIMARY KEY (nutrient_id, age_group_id),
    FOREIGN KEY (nutrient_id)  REFERENCES nutrients (nutrient_id),
    FOREIGN KEY (age_group_id) REFERENCES age_groups (age_group_id)
);

/* ---------- 4. Products (shared) ---------- */
CREATE TABLE IF NOT EXISTS products (
    product_id      INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    product_hash    TEXT    NOT NULL UNIQUE,
    product_type_id INTEGER NOT NULL,
    label_name      TEXT,
    serving_size    REAL,
    serving_unit    TEXT,
    created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    CHECK (
        (serving_size IS NULL AND serving_unit IS NULL)
        OR (serving_size IS NOT NULL AND serving_unit IS NOT NULL)),
    CHECK (serving_size IS NULL OR serving_size > 0),
    CHECK (serving_unit IS NULL OR serving_unit IN ('g', 'ml')),
    FOREIGN KEY (product_type_id) REFERENCES product_types (product_type_id)
);

CREATE TABLE IF NOT EXISTS product_ingredients (
    product_id    INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    position      INTEGER NOT NULL CHECK (position > 0),
    PRIMARY KEY (product_id, position),
    UNIQUE (product_id, ingredient_id),
    FOREIGN KEY (product_id)    REFERENCES products (product_id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id)
);

CREATE TABLE IF NOT EXISTS product_nutrition (
    product_id         INTEGER NOT NULL,
    nutrient_id        INTEGER NOT NULL,
    amount_per_serving REAL    NOT NULL CHECK (amount_per_serving >= 0),
    PRIMARY KEY (product_id, nutrient_id),
    FOREIGN KEY (product_id)  REFERENCES products (product_id) ON DELETE CASCADE,
    FOREIGN KEY (nutrient_id) REFERENCES nutrients (nutrient_id)
);

/* ---------- 5. Reports (personal, snapshots) ---------- */
CREATE TABLE IF NOT EXISTS reports (
    report_id            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    public_id            TEXT    NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(16)))),
    user_id              INTEGER NOT NULL,
    product_id           INTEGER NOT NULL,
    age_group_id         INTEGER NOT NULL,
    user_product_name    TEXT    NOT NULL,
    user_description     TEXT,
    verdict              TEXT    NOT NULL CHECK (verdict IN ('good', 'okay', 'avoid')),
    overall_score        INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    max_servings_per_day REAL,
    days_per_week        INTEGER,
    guidance_basis       TEXT,
    created_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    CHECK (max_servings_per_day IS NULL OR max_servings_per_day >= 0),
    CHECK (days_per_week IS NULL OR (days_per_week BETWEEN 0 AND 7)),
    CHECK (guidance_basis IS NULL OR guidance_basis IN ('rule', 'ai_estimate')),
    CHECK (
        (guidance_basis IS NULL AND max_servings_per_day IS NULL AND days_per_week IS NULL)
        OR (guidance_basis IS NOT NULL AND max_servings_per_day IS NOT NULL AND days_per_week IS NOT NULL)),
    FOREIGN KEY (user_id)      REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id)   REFERENCES products (product_id),
    FOREIGN KEY (age_group_id) REFERENCES age_groups (age_group_id)
);

CREATE TABLE IF NOT EXISTS report_items (
    report_id     INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    rating_id     INTEGER NOT NULL,
    reason        TEXT,
    PRIMARY KEY (report_id, ingredient_id),
    FOREIGN KEY (report_id)     REFERENCES reports (report_id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id),
    FOREIGN KEY (rating_id)     REFERENCES ratings (rating_id)
);

/* ---------- 6. Operations ---------- */
CREATE TABLE IF NOT EXISTS otp_requests (
    otp_id       INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT    NOT NULL,
    otp_hash     TEXT    NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    expires_at   TEXT    NOT NULL,
    attempts     INTEGER NOT NULL DEFAULT 0,
    consumed_at  TEXT
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id   INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    token_hash TEXT    NOT NULL UNIQUE,
    issued_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    expires_at TEXT    NOT NULL,
    revoked_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
    audit_id    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER,
    actor_label TEXT    NOT NULL DEFAULT 'app',
    action      TEXT    NOT NULL,
    entity_type TEXT,
    entity_id   INTEGER,
    details     TEXT,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS scan_events (
    event_id             INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    occurred_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    actor_role           TEXT    NOT NULL CHECK (actor_role IN ('guest', 'user')),
    product_type_id      INTEGER,
    product_id           INTEGER,
    age_group_id         INTEGER,
    verdict              TEXT    CHECK (verdict IS NULL OR verdict IN ('good', 'okay', 'avoid')),
    duration_ms          INTEGER NOT NULL CHECK (duration_ms >= 0),
    cache_hit            INTEGER NOT NULL DEFAULT 0,
    new_ingredient_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (product_type_id) REFERENCES product_types (product_type_id),
    FOREIGN KEY (product_id)      REFERENCES products (product_id) ON DELETE SET NULL,
    FOREIGN KEY (age_group_id)    REFERENCES age_groups (age_group_id)
);

/* ---------- 7. Staging table for ingredient seed ---------- */
CREATE TABLE IF NOT EXISTS stg_ingredient_seed (
    row_id          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    category_code   TEXT    NOT NULL,
    base_rating     TEXT    NOT NULL,
    uses            TEXT,
    disadvantages   TEXT,
    allergens       TEXT,
    age_exceptions  TEXT,
    condition_risks TEXT,
    aliases         TEXT
);

/* ---------- 8. Indexes ---------- */
CREATE INDEX IF NOT EXISTS IX_reports_user_created ON reports (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS IX_reports_product ON reports (product_id);
CREATE INDEX IF NOT EXISTS IX_product_ingredients_ingredient ON product_ingredients (ingredient_id);
CREATE INDEX IF NOT EXISTS IX_report_items_ingredient ON report_items (ingredient_id);
CREATE INDEX IF NOT EXISTS IX_ingredient_aliases_ingredient ON ingredient_aliases (ingredient_id);
CREATE INDEX IF NOT EXISTS IX_scan_events_time ON scan_events (occurred_at);
CREATE INDEX IF NOT EXISTS IX_otp_phone_created ON otp_requests (phone_number, created_at DESC);
CREATE INDEX IF NOT EXISTS IX_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS IX_audit_log_created ON audit_log (created_at);

/* ---------- 9. Lookup seed data ---------- */
INSERT OR IGNORE INTO roles (role_id, code, label) VALUES (1, 'user', 'User');

INSERT OR IGNORE INTO age_groups (age_group_id, code, label, min_age, max_age) VALUES
    (1, 'child',   'Child',   0, 12),
    (2, 'teen',    'Teen',   13, 19),
    (3, 'adult',   'Adult',  20, 59),
    (4, 'old_age', 'Old age', 60, NULL);

INSERT OR IGNORE INTO ratings (rating_id, code, label, severity) VALUES
    (1, 'safe',       'Safe',       1),
    (2, 'adjustable', 'Adjustable', 2),
    (3, 'risk',       'Risk',       3);

INSERT OR IGNORE INTO product_types (product_type_id, code, label) VALUES
    (1, 'food',     'Food'),
    (2, 'drink',    'Drink'),
    (3, 'skincare', 'Skincare'),
    (4, 'other',    'Other');

INSERT OR IGNORE INTO ingredient_categories (code, name) VALUES
    ('sweetener',           'Sweetener'),
    ('preservative',        'Preservative'),
    ('colour',              'Colour'),
    ('flavour',             'Flavour'),
    ('emulsifier',          'Emulsifier or stabiliser'),
    ('antioxidant',         'Antioxidant'),
    ('acidity_regulator',   'Acidity regulator'),
    ('thickener',           'Thickener'),
    ('fat_oil',             'Fat or oil'),
    ('protein',             'Protein'),
    ('vitamin_mineral',     'Vitamin or mineral'),
    ('salt',                'Salt or sodium compound'),
    ('active',              'Skincare active'),
    ('surfactant',          'Surfactant'),
    ('humectant',           'Humectant'),
    ('emollient',           'Emollient'),
    ('fragrance',           'Fragrance'),
    ('sunscreen_filter',    'Sunscreen filter'),
    ('other',               'Other');

INSERT OR IGNORE INTO nutrients (code, name, unit) VALUES
    ('energy',        'Energy',        'kcal'),
    ('sugar',         'Sugar',         'g'),
    ('sodium',        'Sodium',        'mg'),
    ('fat',           'Fat',           'g'),
    ('saturated_fat', 'Saturated fat', 'g'),
    ('caffeine',      'Caffeine',      'mg');

INSERT OR IGNORE INTO health_conditions (code, name) VALUES
    ('diabetes',         'Diabetes or high blood sugar'),
    ('hypertension',     'High blood pressure'),
    ('high_cholesterol', 'High cholesterol'),
    ('heart_disease',    'Heart disease'),
    ('kidney_disease',   'Kidney disease');

INSERT OR IGNORE INTO allergens (code, name) VALUES
    ('peanut',       'Peanut'),
    ('tree_nut',     'Tree nuts'),
    ('milk',         'Milk'),
    ('egg',          'Egg'),
    ('soy',          'Soy'),
    ('wheat_gluten', 'Wheat or gluten'),
    ('fish',         'Fish'),
    ('shellfish',    'Shellfish'),
    ('sesame',       'Sesame'),
    ('mustard',      'Mustard'),
    ('sulphites',    'Sulphites'),
    ('fragrance',    'Fragrance');

INSERT OR IGNORE INTO skin_types (code, name) VALUES
    ('normal',      'Normal'),
    ('dry',         'Dry'),
    ('oily',        'Oily'),
    ('combination', 'Combination'),
    ('sensitive',   'Sensitive');

INSERT OR IGNORE INTO dietary_preferences (code, name) VALUES
    ('vegetarian',     'Vegetarian'),
    ('vegan',          'Vegan'),
    ('eggetarian',     'Eggetarian'),
    ('non_vegetarian', 'Non-vegetarian'),
    ('jain',           'Jain');
