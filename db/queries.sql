/* =====================================================================
   ScanWise - Sample SQL Queries (SQLite 3)
   Version 2.0 - Local / Self-Contained SQL Queries
   ---------------------------------------------------------------------
   Contents
     1  Match extracted names to ingredients and aliases
     2  Unknown ingredients (to send to Gemini AI)
     3  Product reuse check by hash
     4  Personalised ratings for a logged-in user
     5  Personalised ratings for a guest
     6  Consumption guidance with limiting nutrient
     7  Save report verification
     8  History page for a user
     9  One full report by public_id
    10  Pie chart distributions (Ratings and Categories)
    11  Top risky ingredients
    12  Ingredient count and review status
   ===================================================================== */

-- 1. Match extracted names to ingredients and aliases
-- (Using a sample temporary table or IN clause)
SELECT i.ingredient_id, i.name, i.normalized_name, r.code AS base_rating
FROM ingredients i
JOIN ratings r ON r.rating_id = i.base_rating_id
WHERE i.normalized_name IN ('sugar', 'sodium benzoate', 'palm oil')
UNION
SELECT i.ingredient_id, i.name, a.alias_normalized, r.code AS base_rating
FROM ingredient_aliases a
JOIN ingredients i ON i.ingredient_id = a.ingredient_id
JOIN ratings r ON r.rating_id = i.base_rating_id
WHERE a.alias_normalized IN ('e211', 'sucrose');

-- 2. Unknown ingredients check
SELECT 'some new exotic chemical' AS unknown_candidate
WHERE NOT EXISTS (
    SELECT 1 FROM ingredients WHERE normalized_name = 'some new exotic chemical'
) AND NOT EXISTS (
    SELECT 1 FROM ingredient_aliases WHERE alias_normalized = 'some new exotic chemical'
);

-- 3. Product reuse check by product hash
SELECT p.product_id, p.label_name, pt.code AS product_type
FROM products p
JOIN product_types pt ON pt.product_type_id = p.product_type_id
WHERE p.product_hash = 'sample_hash_value_here';

-- 4. Personalised ratings for a logged-in user (User ID = 1)
-- Takes base rating, age exception, condition risk, and allergen match
SELECT pi.position,
       i.name AS ingredient,
       r.code AS personalised_rating,
       ri.reason
FROM report_items ri
JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
JOIN ratings r ON r.rating_id = ri.rating_id
JOIN reports rep ON rep.report_id = ri.report_id
JOIN product_ingredients pi ON pi.product_id = rep.product_id AND pi.ingredient_id = ri.ingredient_id
WHERE rep.user_id = 1
ORDER BY pi.position;

-- 5. Personalised ratings for a guest (Sample computation preview)
SELECT i.name,
       CASE
         WHEN EXISTS (
             SELECT 1 FROM ingredient_allergens ia
             JOIN allergens a ON a.allergen_id = ia.allergen_id
             WHERE ia.ingredient_id = i.ingredient_id AND a.code IN ('peanut')
         ) THEN 'risk'
         WHEN EXISTS (
             SELECT 1 FROM ingredient_condition_risks icr
             JOIN health_conditions hc ON hc.condition_id = icr.condition_id
             WHERE icr.ingredient_id = i.ingredient_id AND hc.code IN ('diabetes') AND icr.rating_id = 3
         ) THEN 'risk'
         ELSE br.code
       END AS calculated_rating
FROM ingredients i
JOIN ratings br ON br.rating_id = i.base_rating_id
WHERE i.normalized_name IN ('sugar', 'peanut');

-- 6. Consumption guidance calculation
SELECT n.code AS limiting_nutrient,
       agl.daily_limit / pn.amount_per_serving AS raw_servings_per_day,
       ROUND((agl.daily_limit / pn.amount_per_serving) * 2) / 2.0 AS max_servings_per_day
FROM product_nutrition pn
JOIN nutrients n ON n.nutrient_id = pn.nutrient_id
JOIN age_groups ag ON ag.code = 'adult'
JOIN age_group_limits agl ON agl.nutrient_id = pn.nutrient_id AND agl.age_group_id = ag.age_group_id
WHERE pn.product_id = 1 AND pn.amount_per_serving > 0
ORDER BY agl.daily_limit / pn.amount_per_serving ASC
LIMIT 1;

-- 7. History page for a user
SELECT r.public_id, r.user_product_name, r.verdict, r.overall_score, r.created_at
FROM reports r
WHERE r.user_id = 1
ORDER BY r.created_at DESC
LIMIT 10 OFFSET 0;

-- 8. One full report by public_id
SELECT r.public_id, r.user_product_name, r.user_description, r.verdict, r.overall_score,
       r.max_servings_per_day, r.days_per_week, r.guidance_basis, r.created_at,
       ag.code AS age_group, pt.code AS product_type
FROM reports r
JOIN age_groups ag ON ag.age_group_id = r.age_group_id
JOIN products p ON p.product_id = r.product_id
JOIN product_types pt ON pt.product_type_id = p.product_type_id
WHERE r.public_id = 'test_public_id' AND r.user_id = 1;

-- 9. Rating & Category distribution for charts
SELECT r.code AS rating, COUNT(*) AS count
FROM report_items ri
JOIN ratings r ON r.rating_id = ri.rating_id
WHERE ri.report_id = 1
GROUP BY r.code;

SELECT ic.name AS category, COUNT(*) AS count
FROM report_items ri
JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
JOIN ingredient_categories ic ON ic.category_id = i.category_id
WHERE ri.report_id = 1
GROUP BY ic.name
ORDER BY count DESC;

-- 10. Ingredient counts summary
SELECT COUNT(*) AS total_ingredients FROM ingredients;
SELECT COUNT(*) AS seed_ingredients FROM ingredients WHERE source = 'seed';
SELECT COUNT(*) AS ai_discovered_ingredients FROM ingredients WHERE source = 'ai';
