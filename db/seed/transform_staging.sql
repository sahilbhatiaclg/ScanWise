/* =====================================================================
   ScanWise - transform dbo.stg_ingredient_seed into the production tables
   Safe to re-run: every statement skips rows that already exist.
   Run AFTER the staging table has been filled (load_seed.py does both).
   Each statement is its own batch (GO), so it also runs in Azure Data Studio.
   Fix vs azure_db_remaining_steps.md: ingredient_aliases has NO "alias"
   column (only alias_normalized), and LEFT() can no longer get a negative
   length when a value has no ':'.
   ===================================================================== */

-- 1. ingredients
INSERT INTO dbo.ingredients (name, normalized_name, category_id, base_rating_id, uses, disadvantages, source, is_reviewed)
SELECT s.name, LOWER(TRIM(s.name)), c.category_id, r.rating_id, s.uses, s.disadvantages, 'seed', 1
FROM dbo.stg_ingredient_seed s
JOIN dbo.ingredient_categories c ON c.code = TRIM(s.category_code)
JOIN dbo.ratings               r ON r.code = TRIM(s.base_rating)
WHERE NOT EXISTS (SELECT 1 FROM dbo.ingredients x WHERE x.normalized_name = LOWER(TRIM(s.name)));
GO

-- 2. aliases (pipe-separated in the CSV)
INSERT INTO dbo.ingredient_aliases (ingredient_id, alias_normalized)
SELECT DISTINCT i.ingredient_id, LOWER(TRIM(a.value))
FROM dbo.stg_ingredient_seed s
JOIN dbo.ingredients i ON i.normalized_name = LOWER(TRIM(s.name))
CROSS APPLY STRING_SPLIT(s.aliases, '|') a
WHERE TRIM(a.value) <> ''
  AND NOT EXISTS (SELECT 1 FROM dbo.ingredient_aliases x WHERE x.alias_normalized = LOWER(TRIM(a.value)));
GO

-- 3. allergen links
INSERT INTO dbo.ingredient_allergens (ingredient_id, allergen_id)
SELECT DISTINCT i.ingredient_id, al.allergen_id
FROM dbo.stg_ingredient_seed s
JOIN dbo.ingredients i ON i.normalized_name = LOWER(TRIM(s.name))
CROSS APPLY STRING_SPLIT(s.allergens, '|') a
JOIN dbo.allergens al ON al.code = TRIM(a.value)
WHERE NOT EXISTS (SELECT 1 FROM dbo.ingredient_allergens x
                  WHERE x.ingredient_id = i.ingredient_id AND x.allergen_id = al.allergen_id);
GO

-- 4. age-group exceptions, format  age_group:rating|age_group:rating
INSERT INTO dbo.ingredient_age_ratings (ingredient_id, age_group_id, rating_id)
SELECT DISTINCT i.ingredient_id, ag.age_group_id, r.rating_id
FROM dbo.stg_ingredient_seed s
JOIN dbo.ingredients i ON i.normalized_name = LOWER(TRIM(s.name))
CROSS APPLY STRING_SPLIT(s.age_exceptions, '|') a
CROSS APPLY (SELECT TRIM(a.value) AS v) t
CROSS APPLY (SELECT LEFT(t.v, NULLIF(CHARINDEX(':', t.v), 0) - 1) AS code1,
                    SUBSTRING(t.v, CHARINDEX(':', t.v) + 1, 50)     AS code2) p
JOIN dbo.age_groups ag ON ag.code = p.code1
JOIN dbo.ratings    r  ON r.code  = p.code2
WHERE NOT EXISTS (SELECT 1 FROM dbo.ingredient_age_ratings x
                  WHERE x.ingredient_id = i.ingredient_id AND x.age_group_id = ag.age_group_id);
GO

-- 5. condition risks, format  condition:rating|condition:rating
INSERT INTO dbo.ingredient_condition_risks (ingredient_id, condition_id, rating_id)
SELECT DISTINCT i.ingredient_id, hc.condition_id, r.rating_id
FROM dbo.stg_ingredient_seed s
JOIN dbo.ingredients i ON i.normalized_name = LOWER(TRIM(s.name))
CROSS APPLY STRING_SPLIT(s.condition_risks, '|') a
CROSS APPLY (SELECT TRIM(a.value) AS v) t
CROSS APPLY (SELECT LEFT(t.v, NULLIF(CHARINDEX(':', t.v), 0) - 1) AS code1,
                    SUBSTRING(t.v, CHARINDEX(':', t.v) + 1, 50)     AS code2) p
JOIN dbo.health_conditions hc ON hc.code = p.code1
JOIN dbo.ratings           r  ON r.code  = p.code2
WHERE NOT EXISTS (SELECT 1 FROM dbo.ingredient_condition_risks x
                  WHERE x.ingredient_id = i.ingredient_id AND x.condition_id = hc.condition_id);
GO

-- 6. verify
SELECT 'ingredients (seed)' AS tbl, COUNT(*) AS n FROM dbo.ingredients WHERE source = 'seed'
UNION ALL SELECT 'ingredient_aliases',         COUNT(*) FROM dbo.ingredient_aliases
UNION ALL SELECT 'ingredient_allergens',       COUNT(*) FROM dbo.ingredient_allergens
UNION ALL SELECT 'ingredient_age_ratings',     COUNT(*) FROM dbo.ingredient_age_ratings
UNION ALL SELECT 'ingredient_condition_risks', COUNT(*) FROM dbo.ingredient_condition_risks;
GO
