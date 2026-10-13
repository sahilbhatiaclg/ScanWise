/* =====================================================================
   ScanWise - database schema (Azure SQL Database / T-SQL)
   Version 1.0 - companion to the SRD
   ---------------------------------------------------------------------
   HOW TO RUN
   - Run on an EMPTY dev database from SSMS, Azure Data Studio or sqlcmd.
     (GO is a client batch separator; pyodbc does not understand it.)
   - NOT yet tested on a live Azure SQL database. Run it early, fix any
     issue, and keep this file as the single source of truth.
   SECTIONS
     0 Schemas
     1 Lookup tables
     2 Users and profiles
     3 Ingredient knowledge
     4 Products
     5 Reports
     6 Operations (OTP, tokens, audit, scan events)
     7 Staging table for the ingredient seed
     8 Indexes
     9 Trigger
    10 Stored procedure (with transaction)
    11 Analytics views (separate schema, replaceable BI layer)
    12 Database roles and permissions
    13 Lookup seed data
   ===================================================================== */

SET NOCOUNT ON;
GO

/* ---------- 0. Schemas ---------- */
IF SCHEMA_ID('analytics') IS NULL EXEC('CREATE SCHEMA analytics');
GO

/* ---------- 1. Lookup tables ---------- */
CREATE TABLE dbo.roles (
    role_id   TINYINT      NOT NULL CONSTRAINT PK_roles PRIMARY KEY,
    code      VARCHAR(20)  NOT NULL CONSTRAINT UQ_roles_code UNIQUE,
    label     NVARCHAR(40) NOT NULL
);

CREATE TABLE dbo.age_groups (
    age_group_id TINYINT      NOT NULL CONSTRAINT PK_age_groups PRIMARY KEY,
    code         VARCHAR(12)  NOT NULL CONSTRAINT UQ_age_groups_code UNIQUE,
    label        NVARCHAR(30) NOT NULL,
    min_age      TINYINT      NOT NULL,
    max_age      TINYINT      NULL,
    CONSTRAINT CK_age_groups_range CHECK (max_age IS NULL OR max_age >= min_age)
);

CREATE TABLE dbo.ratings (
    rating_id TINYINT      NOT NULL CONSTRAINT PK_ratings PRIMARY KEY,
    code      VARCHAR(12)  NOT NULL CONSTRAINT UQ_ratings_code UNIQUE,
    label     NVARCHAR(30) NOT NULL,
    severity  TINYINT      NOT NULL CONSTRAINT UQ_ratings_severity UNIQUE
);

CREATE TABLE dbo.product_types (
    product_type_id TINYINT      NOT NULL CONSTRAINT PK_product_types PRIMARY KEY,
    code            VARCHAR(20)  NOT NULL CONSTRAINT UQ_product_types_code UNIQUE,
    label           NVARCHAR(40) NOT NULL
);

CREATE TABLE dbo.ingredient_categories (
    category_id SMALLINT     IDENTITY(1,1) NOT NULL CONSTRAINT PK_ingredient_categories PRIMARY KEY,
    code        VARCHAR(30)  NOT NULL CONSTRAINT UQ_ingredient_categories_code UNIQUE,
    name        NVARCHAR(60) NOT NULL
);

CREATE TABLE dbo.nutrients (
    nutrient_id SMALLINT     IDENTITY(1,1) NOT NULL CONSTRAINT PK_nutrients PRIMARY KEY,
    code        VARCHAR(30)  NOT NULL CONSTRAINT UQ_nutrients_code UNIQUE,
    name        NVARCHAR(60) NOT NULL,
    unit        VARCHAR(10)  NOT NULL
);

CREATE TABLE dbo.health_conditions (
    condition_id SMALLINT     IDENTITY(1,1) NOT NULL CONSTRAINT PK_health_conditions PRIMARY KEY,
    code         VARCHAR(30)  NOT NULL CONSTRAINT UQ_health_conditions_code UNIQUE,
    name         NVARCHAR(60) NOT NULL
);

CREATE TABLE dbo.allergens (
    allergen_id SMALLINT     IDENTITY(1,1) NOT NULL CONSTRAINT PK_allergens PRIMARY KEY,
    code        VARCHAR(30)  NOT NULL CONSTRAINT UQ_allergens_code UNIQUE,
    name        NVARCHAR(60) NOT NULL
);

CREATE TABLE dbo.skin_types (
    skin_type_id SMALLINT     IDENTITY(1,1) NOT NULL CONSTRAINT PK_skin_types PRIMARY KEY,
    code         VARCHAR(30)  NOT NULL CONSTRAINT UQ_skin_types_code UNIQUE,
    name         NVARCHAR(60) NOT NULL
);

CREATE TABLE dbo.dietary_preferences (
    dietary_preference_id SMALLINT     IDENTITY(1,1) NOT NULL CONSTRAINT PK_dietary_preferences PRIMARY KEY,
    code                  VARCHAR(30)  NOT NULL CONSTRAINT UQ_dietary_preferences_code UNIQUE,
    name                  NVARCHAR(60) NOT NULL
);
GO

/* ---------- 2. Users and profiles ---------- */
-- Guests have NO row here: they exist only as a short-lived token.
-- phone_number storage (as given / hashed / encrypted) is still undecided;
-- only this column and otp_requests.phone_number depend on that decision.
CREATE TABLE dbo.users (
    user_id       INT           IDENTITY(1,1) NOT NULL CONSTRAINT PK_users PRIMARY KEY,
    role_id       TINYINT       NOT NULL CONSTRAINT DF_users_role DEFAULT (1),
    phone_number  NVARCHAR(20)  NOT NULL CONSTRAINT UQ_users_phone UNIQUE,
    consented_at  DATETIME2(0)  NOT NULL,
    created_at    DATETIME2(0)  NOT NULL CONSTRAINT DF_users_created DEFAULT (SYSUTCDATETIME()),
    last_login_at DATETIME2(0)  NULL,
    is_active     BIT           NOT NULL CONSTRAINT DF_users_active DEFAULT (1),
    CONSTRAINT FK_users_role FOREIGN KEY (role_id) REFERENCES dbo.roles (role_id)
);

CREATE TABLE dbo.user_profiles (
    user_id               INT          NOT NULL CONSTRAINT PK_user_profiles PRIMARY KEY,
    age_group_id          TINYINT      NOT NULL,
    skin_type_id          SMALLINT     NULL,
    dietary_preference_id SMALLINT     NULL,
    updated_at            DATETIME2(0) NOT NULL CONSTRAINT DF_user_profiles_updated DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_user_profiles_user  FOREIGN KEY (user_id)               REFERENCES dbo.users (user_id) ON DELETE CASCADE,
    CONSTRAINT FK_user_profiles_age   FOREIGN KEY (age_group_id)          REFERENCES dbo.age_groups (age_group_id),
    CONSTRAINT FK_user_profiles_skin  FOREIGN KEY (skin_type_id)          REFERENCES dbo.skin_types (skin_type_id),
    CONSTRAINT FK_user_profiles_diet  FOREIGN KEY (dietary_preference_id) REFERENCES dbo.dietary_preferences (dietary_preference_id)
);

CREATE TABLE dbo.user_conditions (
    user_id      INT      NOT NULL,
    condition_id SMALLINT NOT NULL,
    CONSTRAINT PK_user_conditions PRIMARY KEY (user_id, condition_id),
    CONSTRAINT FK_user_conditions_user FOREIGN KEY (user_id)      REFERENCES dbo.users (user_id) ON DELETE CASCADE,
    CONSTRAINT FK_user_conditions_cond FOREIGN KEY (condition_id) REFERENCES dbo.health_conditions (condition_id)
);

CREATE TABLE dbo.user_allergens (
    user_id     INT      NOT NULL,
    allergen_id SMALLINT NOT NULL,
    CONSTRAINT PK_user_allergens PRIMARY KEY (user_id, allergen_id),
    CONSTRAINT FK_user_allergens_user FOREIGN KEY (user_id)     REFERENCES dbo.users (user_id) ON DELETE CASCADE,
    CONSTRAINT FK_user_allergens_alg  FOREIGN KEY (allergen_id) REFERENCES dbo.allergens (allergen_id)
);
GO

/* ---------- 3. Ingredient knowledge (shared, no personal data) ---------- */
CREATE TABLE dbo.ingredients (
    ingredient_id   INT            IDENTITY(1,1) NOT NULL CONSTRAINT PK_ingredients PRIMARY KEY,
    name            NVARCHAR(150)  NOT NULL,
    normalized_name NVARCHAR(150)  NOT NULL CONSTRAINT UQ_ingredients_normalized UNIQUE,
    category_id     SMALLINT       NOT NULL,
    uses            NVARCHAR(500)  NULL,
    disadvantages   NVARCHAR(1000) NULL,
    base_rating_id  TINYINT        NOT NULL,
    source          VARCHAR(10)    NOT NULL,
    is_reviewed     BIT            NOT NULL CONSTRAINT DF_ingredients_reviewed DEFAULT (0),
    created_at      DATETIME2(0)   NOT NULL CONSTRAINT DF_ingredients_created DEFAULT (SYSUTCDATETIME()),
    updated_at      DATETIME2(0)   NOT NULL CONSTRAINT DF_ingredients_updated DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_ingredients_source CHECK (source IN ('seed', 'manual', 'ai')),
    CONSTRAINT FK_ingredients_category FOREIGN KEY (category_id)    REFERENCES dbo.ingredient_categories (category_id),
    CONSTRAINT FK_ingredients_rating   FOREIGN KEY (base_rating_id) REFERENCES dbo.ratings (rating_id)
);

CREATE TABLE dbo.ingredient_aliases (
    alias_id         INT           IDENTITY(1,1) NOT NULL CONSTRAINT PK_ingredient_aliases PRIMARY KEY,
    ingredient_id    INT           NOT NULL,
    alias_normalized NVARCHAR(150) NOT NULL CONSTRAINT UQ_ingredient_aliases_alias UNIQUE,
    CONSTRAINT FK_ingredient_aliases_ing FOREIGN KEY (ingredient_id) REFERENCES dbo.ingredients (ingredient_id) ON DELETE CASCADE
);

-- Exceptions only: a row exists when the rating for an age group differs from the base rating.
CREATE TABLE dbo.ingredient_age_ratings (
    ingredient_id INT           NOT NULL,
    age_group_id  TINYINT       NOT NULL,
    rating_id     TINYINT       NOT NULL,
    note          NVARCHAR(200) NULL,
    CONSTRAINT PK_ingredient_age_ratings PRIMARY KEY (ingredient_id, age_group_id),
    CONSTRAINT FK_iar_ingredient FOREIGN KEY (ingredient_id) REFERENCES dbo.ingredients (ingredient_id) ON DELETE CASCADE,
    CONSTRAINT FK_iar_age        FOREIGN KEY (age_group_id)  REFERENCES dbo.age_groups (age_group_id),
    CONSTRAINT FK_iar_rating     FOREIGN KEY (rating_id)     REFERENCES dbo.ratings (rating_id)
);

CREATE TABLE dbo.ingredient_allergens (
    ingredient_id INT      NOT NULL,
    allergen_id   SMALLINT NOT NULL,
    CONSTRAINT PK_ingredient_allergens PRIMARY KEY (ingredient_id, allergen_id),
    CONSTRAINT FK_ia_ingredient FOREIGN KEY (ingredient_id) REFERENCES dbo.ingredients (ingredient_id) ON DELETE CASCADE,
    CONSTRAINT FK_ia_allergen   FOREIGN KEY (allergen_id)   REFERENCES dbo.allergens (allergen_id)
);

-- Rating that applies when the user has the health condition.
CREATE TABLE dbo.ingredient_condition_risks (
    ingredient_id INT           NOT NULL,
    condition_id  SMALLINT      NOT NULL,
    rating_id     TINYINT       NOT NULL,
    note          NVARCHAR(200) NULL,
    CONSTRAINT PK_ingredient_condition_risks PRIMARY KEY (ingredient_id, condition_id),
    CONSTRAINT FK_icr_ingredient FOREIGN KEY (ingredient_id) REFERENCES dbo.ingredients (ingredient_id) ON DELETE CASCADE,
    CONSTRAINT FK_icr_condition  FOREIGN KEY (condition_id)  REFERENCES dbo.health_conditions (condition_id),
    CONSTRAINT FK_icr_rating     FOREIGN KEY (rating_id)     REFERENCES dbo.ratings (rating_id)
);

-- Hand-seeded daily limits. Numbers MUST come from a published source (cite it in source_note).
CREATE TABLE dbo.age_group_limits (
    nutrient_id  SMALLINT      NOT NULL,
    age_group_id TINYINT       NOT NULL,
    daily_limit  DECIMAL(10,2) NOT NULL,
    source_note  NVARCHAR(200) NULL,
    CONSTRAINT PK_age_group_limits PRIMARY KEY (nutrient_id, age_group_id),
    CONSTRAINT CK_age_group_limits_positive CHECK (daily_limit > 0),
    CONSTRAINT FK_agl_nutrient FOREIGN KEY (nutrient_id)  REFERENCES dbo.nutrients (nutrient_id),
    CONSTRAINT FK_agl_age      FOREIGN KEY (age_group_id) REFERENCES dbo.age_groups (age_group_id)
);
GO

/* ---------- 4. Products (shared) ---------- */
CREATE TABLE dbo.products (
    product_id      INT           IDENTITY(1,1) NOT NULL CONSTRAINT PK_products PRIMARY KEY,
    product_hash    CHAR(64)      NOT NULL CONSTRAINT UQ_products_hash UNIQUE,   -- SHA-256 of sorted normalised ingredients + type
    product_type_id TINYINT       NOT NULL,
    label_name      NVARCHAR(200) NULL,
    serving_size    DECIMAL(8,2)  NULL,
    serving_unit    VARCHAR(2)    NULL,
    created_at      DATETIME2(0)  NOT NULL CONSTRAINT DF_products_created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_products_serving_pair CHECK (
        (serving_size IS NULL AND serving_unit IS NULL)
        OR (serving_size IS NOT NULL AND serving_unit IS NOT NULL)),
    CONSTRAINT CK_products_serving_size CHECK (serving_size IS NULL OR serving_size > 0),
    CONSTRAINT CK_products_serving_unit CHECK (serving_unit IS NULL OR serving_unit IN ('g', 'ml')),
    CONSTRAINT FK_products_type FOREIGN KEY (product_type_id) REFERENCES dbo.product_types (product_type_id)
);

CREATE TABLE dbo.product_ingredients (
    product_id    INT      NOT NULL,
    ingredient_id INT      NOT NULL,
    position      SMALLINT NOT NULL,
    CONSTRAINT PK_product_ingredients PRIMARY KEY (product_id, position),
    CONSTRAINT UQ_product_ingredients_ing UNIQUE (product_id, ingredient_id),
    CONSTRAINT CK_product_ingredients_pos CHECK (position > 0),
    CONSTRAINT FK_pi_product    FOREIGN KEY (product_id)    REFERENCES dbo.products (product_id) ON DELETE CASCADE,
    CONSTRAINT FK_pi_ingredient FOREIGN KEY (ingredient_id) REFERENCES dbo.ingredients (ingredient_id)
);

CREATE TABLE dbo.product_nutrition (
    product_id         INT           NOT NULL,
    nutrient_id        SMALLINT      NOT NULL,
    amount_per_serving DECIMAL(10,3) NOT NULL,
    CONSTRAINT PK_product_nutrition PRIMARY KEY (product_id, nutrient_id),
    CONSTRAINT CK_product_nutrition_amount CHECK (amount_per_serving >= 0),
    CONSTRAINT FK_pn_product  FOREIGN KEY (product_id)  REFERENCES dbo.products (product_id) ON DELETE CASCADE,
    CONSTRAINT FK_pn_nutrient FOREIGN KEY (nutrient_id) REFERENCES dbo.nutrients (nutrient_id)
);
GO

/* ---------- 5. Reports (personal, snapshots) ---------- */
CREATE TABLE dbo.reports (
    report_id            INT              IDENTITY(1,1) NOT NULL CONSTRAINT PK_reports PRIMARY KEY,
    public_id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_reports_public DEFAULT (NEWID()) CONSTRAINT UQ_reports_public UNIQUE,
    user_id              INT              NOT NULL,
    product_id           INT              NOT NULL,
    age_group_id         TINYINT          NOT NULL,   -- age group used for this report
    user_product_name    NVARCHAR(200)    NOT NULL,
    user_description     NVARCHAR(500)    NULL,
    verdict              VARCHAR(10)      NOT NULL,
    overall_score        TINYINT          NOT NULL,
    max_servings_per_day DECIMAL(6,2)     NULL,
    days_per_week        TINYINT          NULL,
    guidance_basis       VARCHAR(12)      NULL,
    created_at           DATETIME2(0)     NOT NULL CONSTRAINT DF_reports_created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_reports_verdict CHECK (verdict IN ('good', 'okay', 'avoid')),
    CONSTRAINT CK_reports_score   CHECK (overall_score BETWEEN 0 AND 100),
    CONSTRAINT CK_reports_servings CHECK (max_servings_per_day IS NULL OR max_servings_per_day >= 0),
    CONSTRAINT CK_reports_days    CHECK (days_per_week IS NULL OR days_per_week BETWEEN 0 AND 7),
    CONSTRAINT CK_reports_basis   CHECK (guidance_basis IS NULL OR guidance_basis IN ('rule', 'ai_estimate')),
    CONSTRAINT CK_reports_guidance_all_or_none CHECK (
        (guidance_basis IS NULL AND max_servings_per_day IS NULL AND days_per_week IS NULL)
        OR (guidance_basis IS NOT NULL AND max_servings_per_day IS NOT NULL AND days_per_week IS NOT NULL)),
    CONSTRAINT FK_reports_user    FOREIGN KEY (user_id)      REFERENCES dbo.users (user_id) ON DELETE CASCADE,
    CONSTRAINT FK_reports_product FOREIGN KEY (product_id)   REFERENCES dbo.products (product_id),
    CONSTRAINT FK_reports_age     FOREIGN KEY (age_group_id) REFERENCES dbo.age_groups (age_group_id)
);

CREATE TABLE dbo.report_items (
    report_id     INT           NOT NULL,
    ingredient_id INT           NOT NULL,
    rating_id     TINYINT       NOT NULL,   -- personalised rating at scan time (snapshot)
    reason        NVARCHAR(200) NULL,
    CONSTRAINT PK_report_items PRIMARY KEY (report_id, ingredient_id),
    CONSTRAINT FK_ri_report     FOREIGN KEY (report_id)     REFERENCES dbo.reports (report_id) ON DELETE CASCADE,
    CONSTRAINT FK_ri_ingredient FOREIGN KEY (ingredient_id) REFERENCES dbo.ingredients (ingredient_id),
    CONSTRAINT FK_ri_rating     FOREIGN KEY (rating_id)     REFERENCES dbo.ratings (rating_id)
);
GO

/* ---------- 6. Operations ---------- */
-- OTP table is intentionally not normalised: a person requesting an OTP may not have a users row yet.
CREATE TABLE dbo.otp_requests (
    otp_id       BIGINT       IDENTITY(1,1) NOT NULL CONSTRAINT PK_otp_requests PRIMARY KEY,
    phone_number NVARCHAR(20) NOT NULL,
    otp_hash     CHAR(64)     NOT NULL,
    created_at   DATETIME2(0) NOT NULL CONSTRAINT DF_otp_created DEFAULT (SYSUTCDATETIME()),
    expires_at   DATETIME2(0) NOT NULL,
    attempts     TINYINT      NOT NULL CONSTRAINT DF_otp_attempts DEFAULT (0),
    consumed_at  DATETIME2(0) NULL
);

CREATE TABLE dbo.refresh_tokens (
    token_id   INT          IDENTITY(1,1) NOT NULL CONSTRAINT PK_refresh_tokens PRIMARY KEY,
    user_id    INT          NOT NULL,
    token_hash CHAR(64)     NOT NULL CONSTRAINT UQ_refresh_tokens_hash UNIQUE,
    issued_at  DATETIME2(0) NOT NULL CONSTRAINT DF_refresh_issued DEFAULT (SYSUTCDATETIME()),
    expires_at DATETIME2(0) NOT NULL,
    revoked_at DATETIME2(0) NULL,
    CONSTRAINT FK_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES dbo.users (user_id) ON DELETE CASCADE
);

-- Audit rows survive account deletion: user_id becomes NULL.
CREATE TABLE dbo.audit_log (
    audit_id    BIGINT        IDENTITY(1,1) NOT NULL CONSTRAINT PK_audit_log PRIMARY KEY,
    user_id     INT           NULL,
    actor_label NVARCHAR(128) NOT NULL CONSTRAINT DF_audit_actor DEFAULT (SUSER_SNAME()),
    action      VARCHAR(40)   NOT NULL,
    entity_type VARCHAR(30)   NULL,
    entity_id   INT           NULL,
    details     NVARCHAR(500) NULL,
    created_at  DATETIME2(0)  NOT NULL CONSTRAINT DF_audit_created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_audit_log_user FOREIGN KEY (user_id) REFERENCES dbo.users (user_id) ON DELETE SET NULL
);

-- No user id and no personal data: covers guests and users, feeds analytics.
CREATE TABLE dbo.scan_events (
    event_id             BIGINT       IDENTITY(1,1) NOT NULL CONSTRAINT PK_scan_events PRIMARY KEY,
    occurred_at          DATETIME2(0) NOT NULL CONSTRAINT DF_scan_events_time DEFAULT (SYSUTCDATETIME()),
    actor_role           VARCHAR(5)   NOT NULL,
    product_type_id      TINYINT      NULL,
    product_id           INT          NULL,
    age_group_id         TINYINT      NULL,
    verdict              VARCHAR(10)  NULL,
    duration_ms          INT          NOT NULL,
    cache_hit            BIT          NOT NULL CONSTRAINT DF_scan_events_cache DEFAULT (0),
    new_ingredient_count SMALLINT     NOT NULL CONSTRAINT DF_scan_events_new DEFAULT (0),
    CONSTRAINT CK_scan_events_role    CHECK (actor_role IN ('guest', 'user')),
    CONSTRAINT CK_scan_events_verdict CHECK (verdict IS NULL OR verdict IN ('good', 'okay', 'avoid')),
    CONSTRAINT CK_scan_events_duration CHECK (duration_ms >= 0),
    CONSTRAINT FK_scan_events_type    FOREIGN KEY (product_type_id) REFERENCES dbo.product_types (product_type_id),
    CONSTRAINT FK_scan_events_product FOREIGN KEY (product_id)      REFERENCES dbo.products (product_id) ON DELETE SET NULL,
    CONSTRAINT FK_scan_events_age     FOREIGN KEY (age_group_id)    REFERENCES dbo.age_groups (age_group_id)
);
GO

/* ---------- 7. Staging table for the ingredient seed (loaded later from CSV) ---------- */
-- CSV columns: name,category,base_rating,uses,disadvantages,allergens,age_exceptions,condition_risks,aliases
-- Multi-value cells use '|' ; exceptions are age_group:rating ; condition risks are condition:rating
CREATE TABLE dbo.stg_ingredient_seed (
    row_id          INT            IDENTITY(1,1) NOT NULL CONSTRAINT PK_stg_ingredient_seed PRIMARY KEY,
    name            NVARCHAR(150)  NOT NULL,
    category_code   VARCHAR(30)    NOT NULL,
    base_rating     VARCHAR(12)    NOT NULL,
    uses            NVARCHAR(500)  NULL,
    disadvantages   NVARCHAR(1000) NULL,
    allergens       NVARCHAR(200)  NULL,
    age_exceptions  NVARCHAR(200)  NULL,
    condition_risks NVARCHAR(200)  NULL,
    aliases         NVARCHAR(400)  NULL
);
GO

/* ---------- 8. Indexes (unique constraints above already index
                 ingredients.normalized_name, ingredient_aliases.alias_normalized,
                 products.product_hash, users.phone_number, refresh_tokens.token_hash) ---------- */
CREATE INDEX IX_reports_user_created ON dbo.reports (user_id, created_at DESC)
    INCLUDE (public_id, user_product_name, verdict, overall_score);
CREATE INDEX IX_reports_product ON dbo.reports (product_id);
CREATE INDEX IX_product_ingredients_ingredient ON dbo.product_ingredients (ingredient_id);
CREATE INDEX IX_report_items_ingredient ON dbo.report_items (ingredient_id) INCLUDE (rating_id);
CREATE INDEX IX_ingredient_aliases_ingredient ON dbo.ingredient_aliases (ingredient_id);
CREATE INDEX IX_scan_events_time ON dbo.scan_events (occurred_at);
CREATE INDEX IX_otp_phone_created ON dbo.otp_requests (phone_number, created_at DESC);
CREATE INDEX IX_refresh_tokens_user ON dbo.refresh_tokens (user_id);
CREATE INDEX IX_audit_log_created ON dbo.audit_log (created_at);
GO

/* ---------- 9. Trigger: log manual edits to ingredients ---------- */
CREATE OR ALTER TRIGGER dbo.trg_ingredients_audit
ON dbo.ingredients
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    -- the UPDATE at the end of this trigger re-fires it once; stop the second pass
    IF TRIGGER_NESTLEVEL(OBJECT_ID('dbo.trg_ingredients_audit')) > 1 RETURN;

    INSERT INTO dbo.audit_log (user_id, action, entity_type, entity_id, details)
    SELECT NULL,
           'INGREDIENT_UPDATED',
           'ingredient',
           i.ingredient_id,
           LEFT(CONCAT('rating ', d.base_rating_id, '->', i.base_rating_id,
                       '; reviewed ', d.is_reviewed, '->', i.is_reviewed,
                       '; source ', d.source, '->', i.source), 500)
    FROM inserted i
    JOIN deleted d ON d.ingredient_id = i.ingredient_id
    WHERE i.base_rating_id <> d.base_rating_id
       OR i.is_reviewed    <> d.is_reviewed
       OR i.source         <> d.source
       OR ISNULL(i.uses, N'')          <> ISNULL(d.uses, N'')
       OR ISNULL(i.disadvantages, N'') <> ISNULL(d.disadvantages, N'');

    UPDATE g
       SET updated_at = SYSUTCDATETIME()
    FROM dbo.ingredients g
    JOIN inserted i ON i.ingredient_id = g.ingredient_id;
END;
GO

/* ---------- 10. Stored procedure with transaction ---------- */
-- JSON shapes:
--  @product_ingredients_json : [{"ingredient_id":1,"position":1}, ...]
--  @nutrition_json           : [{"nutrient_code":"sugar","amount":12.5}, ...]   (optional)
--  @items_json               : [{"ingredient_id":1,"rating_code":"risk","reason":"High sugar"}, ...]
CREATE OR ALTER PROCEDURE dbo.sp_save_report
    @user_id                   INT,
    @product_hash              CHAR(64),
    @product_type_code         VARCHAR(20),
    @label_name                NVARCHAR(200) = NULL,
    @serving_size              DECIMAL(8,2)  = NULL,
    @serving_unit              VARCHAR(2)    = NULL,
    @product_ingredients_json  NVARCHAR(MAX),
    @nutrition_json            NVARCHAR(MAX) = NULL,
    @user_product_name         NVARCHAR(200),
    @user_description          NVARCHAR(500) = NULL,
    @age_group_code            VARCHAR(12),
    @verdict                   VARCHAR(10),
    @overall_score             TINYINT,
    @max_servings_per_day      DECIMAL(6,2)  = NULL,
    @days_per_week             TINYINT       = NULL,
    @guidance_basis            VARCHAR(12)   = NULL,
    @items_json                NVARCHAR(MAX),
    @public_id                 UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @product_type_id TINYINT, @age_group_id TINYINT,
            @product_id INT, @report_id INT,
            @expected_items INT, @inserted_items INT;

    SELECT @product_type_id = product_type_id FROM dbo.product_types WHERE code = @product_type_code;
    SELECT @age_group_id    = age_group_id    FROM dbo.age_groups    WHERE code = @age_group_code;

    IF @product_type_id IS NULL OR @age_group_id IS NULL
        THROW 50001, 'Unknown product type or age group.', 1;
    IF @product_ingredients_json IS NULL OR ISJSON(@product_ingredients_json) = 0
        THROW 50002, 'product_ingredients_json is missing or not valid JSON.', 1;
    IF @items_json IS NULL OR ISJSON(@items_json) = 0
        THROW 50002, 'items_json is missing or not valid JSON.', 1;
    IF @nutrition_json IS NOT NULL AND ISJSON(@nutrition_json) = 0
        THROW 50002, 'nutrition_json is not valid JSON.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. product: create only if this ingredient list has never been saved
        --    (UPDLOCK + HOLDLOCK stops two users inserting the same product at once)
        SELECT @product_id = product_id
        FROM dbo.products WITH (UPDLOCK, HOLDLOCK)
        WHERE product_hash = @product_hash;

        IF @product_id IS NULL
        BEGIN
            INSERT INTO dbo.products (product_hash, product_type_id, label_name, serving_size, serving_unit)
            VALUES (@product_hash, @product_type_id, @label_name, @serving_size, @serving_unit);
            SET @product_id = SCOPE_IDENTITY();

            INSERT INTO dbo.product_ingredients (product_id, ingredient_id, position)
            SELECT @product_id, j.ingredient_id, j.position
            FROM OPENJSON(@product_ingredients_json)
                 WITH (ingredient_id INT '$.ingredient_id', position SMALLINT '$.position') AS j;

            IF @nutrition_json IS NOT NULL
                INSERT INTO dbo.product_nutrition (product_id, nutrient_id, amount_per_serving)
                SELECT @product_id, n.nutrient_id, j.amount
                FROM OPENJSON(@nutrition_json)
                     WITH (nutrient_code VARCHAR(30) '$.nutrient_code', amount DECIMAL(10,3) '$.amount') AS j
                JOIN dbo.nutrients n ON n.code = j.nutrient_code;   -- unknown nutrient codes are skipped
        END;

        -- 2. the user's report
        INSERT INTO dbo.reports (user_id, product_id, age_group_id, user_product_name, user_description,
                                 verdict, overall_score, max_servings_per_day, days_per_week, guidance_basis)
        VALUES (@user_id, @product_id, @age_group_id, @user_product_name, @user_description,
                @verdict, @overall_score, @max_servings_per_day, @days_per_week, @guidance_basis);
        SET @report_id = SCOPE_IDENTITY();

        SELECT @public_id = public_id FROM dbo.reports WHERE report_id = @report_id;

        -- 3. per-ingredient personalised ratings (snapshot)
        SELECT @expected_items = COUNT(*) FROM OPENJSON(@items_json);

        INSERT INTO dbo.report_items (report_id, ingredient_id, rating_id, reason)
        SELECT @report_id, j.ingredient_id, r.rating_id, j.reason
        FROM OPENJSON(@items_json)
             WITH (ingredient_id INT '$.ingredient_id', rating_code VARCHAR(12) '$.rating_code', reason NVARCHAR(200) '$.reason') AS j
        JOIN dbo.ratings r ON r.code = j.rating_code;
        SET @inserted_items = @@ROWCOUNT;

        IF @inserted_items <> @expected_items
            THROW 50003, 'One or more report items had an unknown rating code.', 1;

        -- 4. activity log
        INSERT INTO dbo.audit_log (user_id, action, entity_type, entity_id, details)
        VALUES (@user_id, 'REPORT_CREATED', 'report', @report_id, NULL);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

/* ---------- 11. Analytics views (the ONLY thing a BI tool should read) ---------- */
CREATE OR ALTER VIEW analytics.vw_scan_analytics
AS
SELECT CAST(e.occurred_at AS DATE)      AS scan_date,
       DATEPART(HOUR, e.occurred_at)    AS scan_hour,
       e.actor_role,
       pt.code                          AS product_type,
       ag.code                          AS age_group,
       e.verdict,
       e.duration_ms,
       e.cache_hit,
       e.new_ingredient_count
FROM dbo.scan_events e
LEFT JOIN dbo.product_types pt ON pt.product_type_id = e.product_type_id
LEFT JOIN dbo.age_groups     ag ON ag.age_group_id    = e.age_group_id;
GO

CREATE OR ALTER VIEW analytics.vw_ingredient_risk_summary
AS
SELECT i.name   AS ingredient,
       c.name   AS category,
       r.code   AS rating,
       COUNT(*) AS occurrences
FROM dbo.report_items ri
JOIN dbo.ingredients           i ON i.ingredient_id = ri.ingredient_id
JOIN dbo.ingredient_categories c ON c.category_id   = i.category_id
JOIN dbo.ratings               r ON r.rating_id     = ri.rating_id
GROUP BY i.name, c.name, r.code;
GO

/* ---------- 12. Roles and permissions ---------- */
IF DATABASE_PRINCIPAL_ID('app_rw') IS NULL CREATE ROLE app_rw;
IF DATABASE_PRINCIPAL_ID('analytics_reader') IS NULL CREATE ROLE analytics_reader;
GO
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO app_rw;
GRANT EXECUTE ON SCHEMA::dbo TO app_rw;
DENY  UPDATE, DELETE ON dbo.audit_log TO app_rw;     -- audit rows cannot be altered by the app
GRANT SELECT ON SCHEMA::analytics TO analytics_reader;
GO
-- Create the actual logins/users separately, for example:
--   CREATE USER scanwise_app FROM EXTERNAL PROVIDER;  -- or a contained user with a password
--   ALTER ROLE app_rw ADD MEMBER scanwise_app;

/* ---------- 13. Lookup seed data ---------- */
INSERT INTO dbo.roles (role_id, code, label) VALUES (1, 'user', N'User');

INSERT INTO dbo.age_groups (age_group_id, code, label, min_age, max_age) VALUES
    (1, 'child',   N'Child',   0, 12),
    (2, 'teen',    N'Teen',   13, 19),
    (3, 'adult',   N'Adult',  20, 59),
    (4, 'old_age', N'Old age', 60, NULL);

INSERT INTO dbo.ratings (rating_id, code, label, severity) VALUES
    (1, 'safe',       N'Safe',       1),
    (2, 'adjustable', N'Adjustable', 2),
    (3, 'risk',       N'Risk',       3);

INSERT INTO dbo.product_types (product_type_id, code, label) VALUES
    (1, 'food',     N'Food'),
    (2, 'drink',    N'Drink'),
    (3, 'skincare', N'Skincare'),
    (4, 'other',    N'Other');

INSERT INTO dbo.ingredient_categories (code, name) VALUES
    ('sweetener',           N'Sweetener'),
    ('preservative',        N'Preservative'),
    ('colour',              N'Colour'),
    ('flavour',             N'Flavour'),
    ('emulsifier',          N'Emulsifier or stabiliser'),
    ('antioxidant',         N'Antioxidant'),
    ('acidity_regulator',   N'Acidity regulator'),
    ('thickener',           N'Thickener'),
    ('fat_oil',             N'Fat or oil'),
    ('protein',             N'Protein'),
    ('vitamin_mineral',     N'Vitamin or mineral'),
    ('salt',                N'Salt or sodium compound'),
    ('active',              N'Skincare active'),
    ('surfactant',          N'Surfactant'),
    ('humectant',           N'Humectant'),
    ('emollient',           N'Emollient'),
    ('fragrance',           N'Fragrance'),
    ('sunscreen_filter',    N'Sunscreen filter'),
    ('other',               N'Other');

INSERT INTO dbo.nutrients (code, name, unit) VALUES
    ('energy',        N'Energy',        'kcal'),
    ('sugar',         N'Sugar',         'g'),
    ('sodium',        N'Sodium',        'mg'),
    ('fat',           N'Fat',           'g'),
    ('saturated_fat', N'Saturated fat', 'g'),
    ('caffeine',      N'Caffeine',      'mg');

INSERT INTO dbo.health_conditions (code, name) VALUES
    ('diabetes',         N'Diabetes or high blood sugar'),
    ('hypertension',     N'High blood pressure'),
    ('high_cholesterol', N'High cholesterol'),
    ('heart_disease',    N'Heart disease'),
    ('kidney_disease',   N'Kidney disease');

INSERT INTO dbo.allergens (code, name) VALUES
    ('peanut',       N'Peanut'),
    ('tree_nut',     N'Tree nuts'),
    ('milk',         N'Milk'),
    ('egg',          N'Egg'),
    ('soy',          N'Soy'),
    ('wheat_gluten', N'Wheat or gluten'),
    ('fish',         N'Fish'),
    ('shellfish',    N'Shellfish'),
    ('sesame',       N'Sesame'),
    ('mustard',      N'Mustard'),
    ('sulphites',    N'Sulphites'),
    ('fragrance',    N'Fragrance');

INSERT INTO dbo.skin_types (code, name) VALUES
    ('normal',      N'Normal'),
    ('dry',         N'Dry'),
    ('oily',        N'Oily'),
    ('combination', N'Combination'),
    ('sensitive',   N'Sensitive');

INSERT INTO dbo.dietary_preferences (code, name) VALUES
    ('vegetarian',     N'Vegetarian'),
    ('vegan',          N'Vegan'),
    ('eggetarian',     N'Eggetarian'),
    ('non_vegetarian', N'Non-vegetarian'),
    ('jain',           N'Jain');

-- age_group_limits is intentionally NOT seeded here. Add rows only from a published source, e.g.:
--   INSERT INTO dbo.age_group_limits (nutrient_id, age_group_id, daily_limit, source_note)
--   VALUES ((SELECT nutrient_id FROM dbo.nutrients WHERE code = 'sodium'), 3, <value>, N'<source, year>');
GO