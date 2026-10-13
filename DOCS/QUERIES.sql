/* =====================================================================
   ScanWise - sample queries (Azure SQL / T-SQL)
   Version 1.0 - companion to the SRD and schema.sql
   ---------------------------------------------------------------------
   Run schema.sql first. NOT yet tested on a live database: run these
   one by one, fix anything that fails, and use fictional data only.
   Each query is a separate block; run one block at a time.
   Contents
     1  Match extracted names to ingredients and aliases
     2  Unknown ingredients (to send to AI)
     3  Product reuse check by hash
     4  Personalised ratings for a logged-in user
     5  Personalised ratings for a guest (JSON parameters)
     6  Consumption guidance with the limiting nutrient
     7  Save a report (stored procedure + transaction)
     8  History page for a user
     9  One full report by public_id, owned by the user
    10  Pie chart data for a report
    11  Top risky ingredients (analytics view, DENSE_RANK)
    12  Scans per day, guest vs user
    13  AI-added ingredients waiting for review
    14  Trigger demonstration
    15  Account deletion and cascade check
    16  OTP cleanup
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. Match extracted names to ingredients and aliases
   Input: normalised names from the extraction step (JSON array).
   ingredient_id NULL means unknown.
   --------------------------------------------------------------------- */
DECLARE @names NVARCHAR(MAX) = N'["sugar","e211","palm oil","some new thing"]';

SELECT n.[key]                                    AS position_in_label,
       n.value                                    AS input_name,
       COALESCE(i.ingredient_id, a.ingredient_id) AS ingredient_id
FROM OPENJSON(@names) AS n
LEFT JOIN dbo.ingredients        i ON i.normalized_name  = n.value
LEFT JOIN dbo.ingredient_aliases a ON a.alias_normalized = n.value
ORDER BY CAST(n.[key] AS INT);
GO


/* ---------------------------------------------------------------------
   2. Unknown ingredients: names that match neither an ingredient nor an alias
   These are the only names sent to Gemini.
   --------------------------------------------------------------------- */
DECLARE @names NVARCHAR(MAX) = N'["sugar","e211","palm oil","some new thing"]';

SELECT n.value AS unknown_name
FROM OPENJSON(@names) AS n
WHERE NOT EXISTS (SELECT 1 FROM dbo.ingredients        i WHERE i.normalized_name  = n.value)
  AND NOT EXISTS (SELECT 1 FROM dbo.ingredient_aliases a WHERE a.alias_normalized = n.value);
GO


/* ---------------------------------------------------------------------
   3. Product reuse check by hash
   Found: reuse the saved product and only recompute personalisation.
   --------------------------------------------------------------------- */
DECLARE @product_hash CHAR(64) = REPLICATE('a', 64);   -- replace with a real hash

SELECT p.product_id, p.label_name, pt.code AS product_type
FROM dbo.products p
JOIN dbo.product_types pt ON pt.product_type_id = p.product_type_id
WHERE p.product_hash = @product_hash;
GO


/* ---------------------------------------------------------------------
   4. Personalised rating per ingredient for a LOGGED-IN user
   Effective severity = highest of:
     base rating, age-group exception, condition risk, allergen match (= risk)
   Techniques: joins, OUTER APPLY, table value constructor, MAX.
   --------------------------------------------------------------------- */
DECLARE @user_id INT = 1, @product_id INT = 1;

SELECT pi.position,
       i.name AS ingredient,
       (SELECT r.code FROM dbo.ratings r WHERE r.severity = x.final_severity) AS personalised_rating
FROM dbo.product_ingredients pi
JOIN dbo.ingredients   i  ON i.ingredient_id = pi.ingredient_id
JOIN dbo.ratings       br ON br.rating_id    = i.base_rating_id
JOIN dbo.user_profiles up ON up.user_id      = @user_id
OUTER APPLY (
    SELECT r.severity
    FROM dbo.ingredient_age_ratings iar
    JOIN dbo.ratings r ON r.rating_id = iar.rating_id
    WHERE iar.ingredient_id = i.ingredient_id
      AND iar.age_group_id  = up.age_group_id
) AS ag
OUTER APPLY (
    SELECT MAX(r.severity) AS sev
    FROM dbo.ingredient_condition_risks icr
    JOIN dbo.user_conditions uc ON uc.condition_id = icr.condition_id AND uc.user_id = @user_id
    JOIN dbo.ratings r          ON r.rating_id     = icr.rating_id
    WHERE icr.ingredient_id = i.ingredient_id
) AS cond
OUTER APPLY (
    SELECT 1 AS hit
    WHERE EXISTS (
        SELECT 1
        FROM dbo.ingredient_allergens ia
        JOIN dbo.user_allergens ua ON ua.allergen_id = ia.allergen_id AND ua.user_id = @user_id
        WHERE ia.ingredient_id = i.ingredient_id)
) AS alg
CROSS APPLY (
    SELECT MAX(v) AS final_severity
    FROM (VALUES (br.severity), (ag.severity), (cond.sev), (CASE WHEN alg.hit = 1 THEN 3 END)) AS t(v)
) AS x
WHERE pi.product_id = @product_id
ORDER BY pi.position;
GO


/* ---------------------------------------------------------------------
   5. Personalised rating per ingredient for a GUEST
   Nothing is stored for guests: age group, conditions and allergens
   arrive as request parameters.
   --------------------------------------------------------------------- */
DECLARE @product_id INT = 1,
        @age_group_code VARCHAR(12) = 'adult',
        @conditions NVARCHAR(MAX) = N'["diabetes"]',
        @allergens  NVARCHAR(MAX) = N'["peanut"]';

SELECT pi.position,
       i.name AS ingredient,
       (SELECT r.code FROM dbo.ratings r WHERE r.severity = x.final_severity) AS personalised_rating
FROM dbo.product_ingredients pi
JOIN dbo.ingredients i  ON i.ingredient_id = pi.ingredient_id
JOIN dbo.ratings     br ON br.rating_id    = i.base_rating_id
OUTER APPLY (
    SELECT r.severity
    FROM dbo.ingredient_age_ratings iar
    JOIN dbo.age_groups g ON g.age_group_id = iar.age_group_id AND g.code = @age_group_code
    JOIN dbo.ratings r    ON r.rating_id    = iar.rating_id
    WHERE iar.ingredient_id = i.ingredient_id
) AS ag
OUTER APPLY (
    SELECT MAX(r.severity) AS sev
    FROM dbo.ingredient_condition_risks icr
    JOIN dbo.health_conditions hc ON hc.condition_id = icr.condition_id
    JOIN dbo.ratings r            ON r.rating_id     = icr.rating_id
    WHERE icr.ingredient_id = i.ingredient_id
      AND hc.code IN (SELECT value FROM OPENJSON(@conditions))
) AS cond
OUTER APPLY (
    SELECT 1 AS hit
    WHERE EXISTS (
        SELECT 1
        FROM dbo.ingredient_allergens ia
        JOIN dbo.allergens al ON al.allergen_id = ia.allergen_id
        WHERE ia.ingredient_id = i.ingredient_id
          AND al.code IN (SELECT value FROM OPENJSON(@allergens)))
) AS alg
CROSS APPLY (
    SELECT MAX(v) AS final_severity
    FROM (VALUES (br.severity), (ag.severity), (cond.sev), (CASE WHEN alg.hit = 1 THEN 3 END)) AS t(v)
) AS x
WHERE pi.product_id = @product_id
ORDER BY pi.position;
GO


/* ---------------------------------------------------------------------
   6. Consumption guidance
   For each nutrient with both a product amount and an age-group limit:
   servings per day = daily_limit / amount_per_serving.
   The smallest value limits the product; rounded down to half a serving.
   Needs rows in dbo.age_group_limits (see schema.sql note).
   --------------------------------------------------------------------- */
DECLARE @product_id INT = 1, @age_group_code VARCHAR(12) = 'adult';

SELECT TOP (1)
       n.code                                                          AS limiting_nutrient,
       l.daily_limit / NULLIF(pn.amount_per_serving, 0)                AS raw_servings_per_day,
       FLOOR(l.daily_limit / NULLIF(pn.amount_per_serving, 0) * 2) / 2.0 AS max_servings_per_day
FROM dbo.product_nutrition pn
JOIN dbo.nutrients        n ON n.nutrient_id  = pn.nutrient_id
JOIN dbo.age_groups       g ON g.code         = @age_group_code
JOIN dbo.age_group_limits l ON l.nutrient_id  = pn.nutrient_id AND l.age_group_id = g.age_group_id
WHERE pn.product_id = @product_id
  AND pn.amount_per_serving > 0
ORDER BY l.daily_limit / pn.amount_per_serving ASC;
GO


/* ---------------------------------------------------------------------
   7. Save a report: stored procedure with the transaction inside
   Replace the ids with real ingredient ids from your seed data.
   --------------------------------------------------------------------- */
DECLARE @new_public_id UNIQUEIDENTIFIER;

EXEC dbo.sp_save_report
     @user_id                  = 1,
     @product_hash             = '0000000000000000000000000000000000000000000000000000000000000001',
     @product_type_code        = 'food',
     @label_name               = N'Sample biscuit',
     @serving_size             = 30,
     @serving_unit             = 'g',
     @product_ingredients_json = N'[{"ingredient_id":1,"position":1},{"ingredient_id":2,"position":2}]',
     @nutrition_json           = N'[{"nutrient_code":"sugar","amount":9.5},{"nutrient_code":"sodium","amount":120}]',
     @user_product_name        = N'My biscuit',
     @user_description         = N'Bought at the campus shop',
     @age_group_code           = 'adult',
     @verdict                  = 'okay',
     @overall_score            = 62,
     @max_servings_per_day     = 2.0,
     @days_per_week            = 4,
     @guidance_basis           = 'rule',
     @items_json               = N'[{"ingredient_id":1,"rating_code":"adjustable","reason":"High sugar"},{"ingredient_id":2,"rating_code":"safe","reason":null}]',
     @public_id                = @new_public_id OUTPUT;

SELECT @new_public_id AS saved_report_public_id;

-- Failure test: a bad rating code must roll everything back (no product, report or items saved).
-- EXEC dbo.sp_save_report ... @items_json = N'[{"ingredient_id":1,"rating_code":"nonsense"}]' ...
GO


/* ---------------------------------------------------------------------
   8. History page for a user (newest first, paged)
   Uses IX_reports_user_created.
   --------------------------------------------------------------------- */
DECLARE @user_id INT = 1, @page INT = 1, @page_size INT = 10;

SELECT r.public_id, r.user_product_name, r.verdict, r.overall_score, r.created_at
FROM dbo.reports r
WHERE r.user_id = @user_id
ORDER BY r.created_at DESC
OFFSET (@page - 1) * @page_size ROWS FETCH NEXT @page_size ROWS ONLY;
GO


/* ---------------------------------------------------------------------
   9. One full report by public_id, only if it belongs to the user
   (Filtering by user_id too means guessing another report's id returns nothing.)
   --------------------------------------------------------------------- */
DECLARE @public_id UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000000',   -- replace
        @user_id INT = 1;

SELECT r.public_id, r.user_product_name, r.user_description, r.verdict, r.overall_score,
       r.max_servings_per_day, r.days_per_week, r.guidance_basis, r.created_at,
       ag.code  AS age_group,
       p.label_name, pt.code AS product_type,
       i.name   AS ingredient, c.name AS category, rt.code AS rating, ri.reason,
       pi.position
FROM dbo.reports r
JOIN dbo.age_groups            ag ON ag.age_group_id    = r.age_group_id
JOIN dbo.products              p  ON p.product_id       = r.product_id
JOIN dbo.product_types         pt ON pt.product_type_id = p.product_type_id
JOIN dbo.report_items          ri ON ri.report_id       = r.report_id
JOIN dbo.ingredients           i  ON i.ingredient_id    = ri.ingredient_id
JOIN dbo.ingredient_categories c  ON c.category_id      = i.category_id
JOIN dbo.ratings               rt ON rt.rating_id       = ri.rating_id
LEFT JOIN dbo.product_ingredients pi ON pi.product_id = r.product_id AND pi.ingredient_id = ri.ingredient_id
WHERE r.public_id = @public_id
  AND r.user_id   = @user_id
ORDER BY pi.position;
GO


/* ---------------------------------------------------------------------
   10. Pie chart data for one report
   10a rating share (safe / adjustable / risk)   10b category share
   --------------------------------------------------------------------- */
DECLARE @report_id INT = 1;

-- 10a
SELECT rt.code AS rating, COUNT(*) AS ingredient_count
FROM dbo.report_items ri
JOIN dbo.ratings rt ON rt.rating_id = ri.rating_id
WHERE ri.report_id = @report_id
GROUP BY rt.code, rt.severity
ORDER BY rt.severity;

-- 10b
SELECT c.name AS category, COUNT(*) AS ingredient_count
FROM dbo.report_items ri
JOIN dbo.ingredients i           ON i.ingredient_id = ri.ingredient_id
JOIN dbo.ingredient_categories c ON c.category_id   = i.category_id
WHERE ri.report_id = @report_id
GROUP BY c.name
ORDER BY ingredient_count DESC;
GO


/* ---------------------------------------------------------------------
   11. Top 10 ingredients most often rated risk (reads the analytics view only)
   --------------------------------------------------------------------- */
SELECT TOP (10)
       ingredient, category, occurrences,
       DENSE_RANK() OVER (ORDER BY occurrences DESC) AS rank_no
FROM analytics.vw_ingredient_risk_summary
WHERE rating = 'risk'
ORDER BY occurrences DESC;
GO


/* ---------------------------------------------------------------------
   12. Scans per day, guest vs user, with speed and cache-hit rate
   (reads the analytics view only)
   --------------------------------------------------------------------- */
SELECT scan_date,
       actor_role,
       COUNT(*)                              AS scans,
       AVG(CAST(duration_ms AS FLOAT))       AS avg_duration_ms,
       AVG(CAST(cache_hit AS FLOAT))         AS cache_hit_rate,
       SUM(new_ingredient_count)             AS new_ingredients_added
FROM analytics.vw_scan_analytics
GROUP BY scan_date, actor_role
ORDER BY scan_date DESC, actor_role;
GO


/* ---------------------------------------------------------------------
   13. Ingredients added by AI that nobody has reviewed yet
   This replaces an admin screen: review these rows and correct them with an UPDATE.
   --------------------------------------------------------------------- */
SELECT i.ingredient_id, i.name, c.name AS category, rt.code AS base_rating, i.uses, i.disadvantages, i.created_at
FROM dbo.ingredients i
JOIN dbo.ingredient_categories c ON c.category_id = i.category_id
JOIN dbo.ratings rt              ON rt.rating_id  = i.base_rating_id
WHERE i.source = 'ai' AND i.is_reviewed = 0
ORDER BY i.created_at DESC;
GO


/* ---------------------------------------------------------------------
   14. Trigger demonstration
   A manual correction writes an audit row and refreshes updated_at.
   --------------------------------------------------------------------- */
UPDATE dbo.ingredients
SET base_rating_id = 3, is_reviewed = 1, source = 'manual'
WHERE normalized_name = 'sugar';      -- use an ingredient that exists in your data

SELECT TOP (5) audit_id, action, entity_type, entity_id, details, actor_label, created_at
FROM dbo.audit_log
ORDER BY audit_id DESC;
GO


/* ---------------------------------------------------------------------
   15. Account deletion and cascade check
   Deleting the user removes profile, conditions, allergens, tokens, reports and report items.
   Shared products and ingredients stay. Audit rows stay with user_id = NULL.
   Use a fictional test user only.
   --------------------------------------------------------------------- */
DECLARE @user_id INT = 1;

BEGIN TRANSACTION;
    DELETE FROM dbo.users WHERE user_id = @user_id;

    SELECT (SELECT COUNT(*) FROM dbo.reports       WHERE user_id = @user_id) AS reports_left,
           (SELECT COUNT(*) FROM dbo.user_profiles WHERE user_id = @user_id) AS profiles_left,
           (SELECT COUNT(*) FROM dbo.audit_log     WHERE user_id IS NULL)    AS audit_rows_with_null_user;
ROLLBACK TRANSACTION;   -- change to COMMIT to really delete
GO


/* ---------------------------------------------------------------------
   16. OTP cleanup (run on a schedule, for example daily)
   --------------------------------------------------------------------- */
DELETE FROM dbo.otp_requests
WHERE expires_at < DATEADD(DAY, -1, SYSUTCDATETIME());
GO