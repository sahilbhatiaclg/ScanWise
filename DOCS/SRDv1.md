# ScanWise — System and Database Requirements Document (SRD)

Oct 11, 2026 · @Sahil Bhatia · Version 1.0 · Companion files: `schema.sql`, `queries.sql` (for the `/db` folder)

## 1. Purpose and scope

This document defines the data model for ScanWise: every table with its keys and constraints, the view, stored procedure, trigger and transaction, the indexes, the seed-data format and the sample queries. App behaviour is in the PRD and TRD; this document only covers the database and data requirements. It targets **Azure SQL Database (T-SQL)** and maps directly to the RDBMS and DP-900 marking criteria.

The SQL files have not been run against a live Azure SQL database yet. Run `schema.sql` on an empty dev database in the first days and fix any syntax issues before the design review.

## 2. Design principles

1. **Third normal form** for all application data. The one deliberate exception is the OTP login table (see section 6).
2. **Shared knowledge versus personal data.** Ingredients, products and ratings are shared by all users and hold no personal data. Reports, profiles and tokens belong to one user and are deleted with the account.
3. **Exceptions only for age ratings.** Each ingredient has one base rating. A row in `ingredient_age_ratings` exists only when the rating differs for an age group, so the seed stays small.
4. **Reports are snapshots.** A report copies each ingredient's personalised rating at scan time, so editing an ingredient later never changes an old report.
5. **Replaceable analytics layer.** Any dashboard tool reads only the `analytics` schema (views), never the base tables. Power BI is not confirmed, so it can be swapped for another tool, or a different report built, without touching the application tables.
6. **No label images are stored.** Only extracted and analysed data is kept.
7. **Phone-number storage is undecided.** It sits in one column (`users.phone_number`, plus `otp_requests.phone_number`). Changing to hashed or encrypted storage later changes only those columns and the login lookup.
8. **Lookup tables instead of free text.** Age groups, ratings, conditions, allergens and similar values are rows, so they can change without altering the schema.

## 3. Data model overview

There are **29 tables** in six groups, plus one staging table used when loading seed data.

| Group | Tables |
| --- | --- |
| A. Lookups (10) | `roles`, `age_groups`, `ratings`, `product_types`, `ingredient_categories`, `nutrients`, `health_conditions`, `allergens`, `skin_types`, `dietary_preferences` |
| B. Users and profiles (4) | `users`, `user_profiles`, `user_conditions`, `user_allergens` |
| C. Ingredient knowledge (6) | `ingredients`, `ingredient_aliases`, `ingredient_age_ratings`, `ingredient_allergens`, `ingredient_condition_risks`, `age_group_limits` |
| D. Products (3) | `products`, `product_ingredients`, `product_nutrition` |
| E. Reports (2) | `reports`, `report_items` |
| F. Operations (4) | `otp_requests`, `refresh_tokens`, `audit_log`, `scan_events` |

### ER diagram

The diagram below shows the core entities and relationships. Lookup tables are listed in the data dictionary rather than drawn, to keep the diagram readable.

&#91;embedded content: ER diagram · core entities and relationships\]

Reports keep a copy of each ingredient's rating, so editing an ingredient later never changes an old report.

## 4. Data dictionary

Full column definitions and constraint names are in `schema.sql`. PK is primary key, FK is foreign key, UQ is unique. Delete rules are in section 5.

### Group A. Lookups

| Table | Columns | Keys and constraints |
| --- | --- | --- |
| `roles` | `role_id` TINYINT, `code`, `label` | PK `role_id`; UQ `code`. Seeded with `user` only; an admin role can be added later with one row |
| `age_groups` | `age_group_id` TINYINT, `code`, `label`, `min_age`, `max_age` | PK; UQ `code`; CHECK `max_age >= min_age`. Rows: child, teen, adult, old\_age |
| `ratings` | `rating_id` TINYINT, `code`, `label`, `severity` | PK; UQ `code`; UQ `severity`. Rows: safe (1), adjustable (2), risk (3) |
| `product_types` | `product_type_id` TINYINT, `code`, `label` | PK; UQ `code`. Rows: food, drink, skincare, other |
| `ingredient_categories` | `category_id` SMALLINT identity, `code`, `name` | PK; UQ `code`. Includes an `other` fallback for unknown AI results |
| `nutrients` | `nutrient_id` SMALLINT identity, `code`, `name`, `unit` | PK; UQ `code`. Energy, sugar, sodium, fat, saturated fat, caffeine |
| `health_conditions` | `condition_id`, `code`, `name` | PK; UQ `code`. Diabetes, high blood pressure, high cholesterol, heart disease, kidney disease |
| `allergens` | `allergen_id`, `code`, `name` | PK; UQ `code` |
| `skin_types` | `skin_type_id`, `code`, `name` | PK; UQ `code` |
| `dietary_preferences` | `dietary_preference_id`, `code`, `name` | PK; UQ `code` |

### Group B. Users and profiles

| Table | Columns | Keys and constraints |
| --- | --- | --- |
| `users` | `user_id` INT identity, `role_id`, `phone_number` NVARCHAR(20), `consented_at`, `created_at`, `last_login_at`, `is_active` | PK; UQ `phone_number`; FK `role_id` (default 1 = user) |
| `user_profiles` | `user_id`, `age_group_id`, `skin_type_id` (null), `dietary_preference_id` (null), `updated_at` | PK `user_id` (1:1 with users); FKs to users (cascade), age\_groups, skin\_types, dietary\_preferences |
| `user_conditions` | `user_id`, `condition_id` | Composite PK; FKs (cascade on user) |
| `user_allergens` | `user_id`, `allergen_id` | Composite PK; FKs (cascade on user) |

### Group C. Ingredient knowledge

| Table | Columns | Keys and constraints |
| --- | --- | --- |
| `ingredients` | `ingredient_id` INT identity, `name`, `normalized_name`, `category_id`, `uses`, `disadvantages`, `base_rating_id`, `source`, `is_reviewed`, `created_at`, `updated_at` | PK; UQ `normalized_name`; FKs to categories and ratings; CHECK `source` in (seed, manual, ai) |
| `ingredient_aliases` | `alias_id`, `ingredient_id`, `alias_normalized` | PK; UQ `alias_normalized`; FK ingredient (cascade). For E-numbers and other names |
| `ingredient_age_ratings` | `ingredient_id`, `age_group_id`, `rating_id`, `note` | Composite PK; FKs. Exceptions to the base rating only |
| `ingredient_allergens` | `ingredient_id`, `allergen_id` | Composite PK; FKs |
| `ingredient_condition_risks` | `ingredient_id`, `condition_id`, `rating_id`, `note` | Composite PK; FKs. Rating that applies when the user has that condition |
| `age_group_limits` | `nutrient_id`, `age_group_id`, `daily_limit`, `source_note` | Composite PK; CHECK `daily_limit > 0`. Hand-seeded |

### Group D. Products

| Table | Columns | Keys and constraints |
| --- | --- | --- |
| `products` | `product_id` INT identity, `product_hash` CHAR(64), `product_type_id`, `label_name` (null), `serving_size` (null), `serving_unit` (null), `created_at` | PK; UQ `product_hash`; FK `product_type_id`; CHECK serving size and unit are both set or both empty; CHECK unit in (g, ml) |
| `product_ingredients` | `product_id`, `ingredient_id`, `position` | PK (`product_id`, `position`); UQ (`product_id`, `ingredient_id`); FK product (cascade), FK ingredient |
| `product_nutrition` | `product_id`, `nutrient_id`, `amount_per_serving` | Composite PK; CHECK `amount_per_serving >= 0` |

### Group E. Reports

| Table | Columns | Keys and constraints |
| --- | --- | --- |
| `reports` | `report_id` INT identity, `public_id` UNIQUEIDENTIFIER (random), `user_id`, `product_id`, `age_group_id`, `user_product_name`, `user_description` (null), `verdict`, `overall_score`, `max_servings_per_day` (null), `days_per_week` (null), `guidance_basis` (null), `created_at` | PK; UQ `public_id`; FK user (cascade), product, age\_group; CHECK verdict in (good, okay, avoid); CHECK score 0 to 100; CHECK days\_per\_week 0 to 7; CHECK guidance\_basis in (rule, ai\_estimate); CHECK the three guidance columns are all set or all empty |
| `report_items` | `report_id`, `ingredient_id`, `rating_id`, `reason` | Composite PK; FK report (cascade), ingredient, rating |

### Group F. Operations

| Table | Columns | Keys and constraints |
| --- | --- | --- |
| `otp_requests` | `otp_id` BIGINT identity, `phone_number`, `otp_hash`, `created_at`, `expires_at`, `attempts`, `consumed_at` (null) | PK. Short-lived; rows older than a day are deleted |
| `refresh_tokens` | `token_id`, `user_id`, `token_hash`, `issued_at`, `expires_at`, `revoked_at` (null) | PK; UQ `token_hash`; FK user (cascade) |
| `audit_log` | `audit_id` BIGINT identity, `user_id` (null), `actor_label`, `action`, `entity_type`, `entity_id`, `details`, `created_at` | PK; FK user (set null on delete). The app role cannot update or delete rows |
| `scan_events` | `event_id` BIGINT identity, `occurred_at`, `actor_role`, `product_type_id`, `product_id`, `age_group_id`, `verdict`, `duration_ms`, `cache_hit`, `new_ingredient_count` | PK; CHECK `actor_role` in (guest, user); FKs (product set null). No user ID, so no personal data |

## 5. Relationships and delete rules

| Relationship | Cardinality | On delete |
| --- | --- | --- |
| users to user\_profiles | 1 to 1 | Cascade |
| users to user\_conditions, user\_allergens | 1 to many | Cascade |
| users to reports | 1 to many | Cascade (account deletion removes reports and their items) |
| users to refresh\_tokens | 1 to many | Cascade |
| users to audit\_log | 1 to many | Set null (audit rows stay, user ID is emptied) |
| reports to report\_items | 1 to many | Cascade |
| products to reports | 1 to many | Restricted (a product with reports cannot be deleted) |
| products to product\_ingredients, product\_nutrition | 1 to many | Cascade |
| ingredients to product\_ingredients, report\_items | 1 to many | Restricted (an ingredient in use cannot be deleted) |
| ingredients to aliases, age ratings, allergens, condition risks | 1 to many | Cascade |
| ingredients and conditions or allergens | many to many | Through `ingredient_condition_risks` and `ingredient_allergens` |
| products to scan\_events | 1 to many | Set null |

Account deletion is one statement: `DELETE FROM dbo.users WHERE user_id = @id`. A report, its items, the profile and the tokens go with it, and shared products and ingredients stay.

## 6. Normalisation notes

- **1NF:** every column holds one value. Lists (conditions, allergens, aliases, ingredients of a product) are separate rows, not comma-separated text.
- **2NF:** tables with composite keys (for example `product_ingredients`, `ingredient_age_ratings`) hold only attributes that depend on the whole key.
- **3NF:** no attribute depends on another non-key attribute. Examples: a nutrient's unit lives in `nutrients`, not in each product row; an age group's range lives in `age_groups`; a rating's severity lives in `ratings`.
- **Deliberately not stored:** counts of safe, adjustable and risk ingredients. They are derived from `report_items`, so storing them would break 3NF; the charts compute them with `GROUP BY`.
- **Stored on purpose:** `reports.verdict`, `overall_score` and the guidance columns are results of personalisation at scan time. They cannot be recomputed later because ingredient data may have changed, so they are facts about the report, not redundant copies.
- **Exception (OTP login):** `otp_requests.phone_number` repeats the phone number because a person requesting an OTP may not have a `users` row yet. This is intentional and limited to a short-lived table.

## 7. Personalisation in data

**Effective rating of an ingredient for a user** is the highest severity among:

1. the ingredient's base rating;
2. the exception for the user's age group, if one exists;
3. the rating for any health condition the user has, from `ingredient_condition_risks`;
4. risk (3), if the ingredient contains an allergen the user listed.

Guests follow the same rules, using the age group and conditions sent with the request; nothing is stored. Both versions are in `queries.sql`.

**Consumption guidance** divides each nutrient's daily limit for the age group (`age_group_limits`) by the amount per serving (`product_nutrition`). The smallest result is the limit for the product and names the limiting nutrient. It is rounded down to the nearest half serving. If the label has no nutrition data, the app uses a labelled AI estimate and stores `guidance_basis = ai_estimate`.

`days_per_week` is the number of days per week the amount is suitable. Which rule sets it (for example from the verdict) is decided in the application code; this is an assumption for you to confirm.

## 8. Database objects

| Object | Name | What it does |
| --- | --- | --- |
| View | `analytics.vw_scan_analytics` | Daily and hourly scan data for dashboards: role, product type, age group, verdict, duration, cache hit, new ingredients. Built on `scan_events` (includes guests) |
| View | `analytics.vw_ingredient_risk_summary` | How often each ingredient appeared with each rating across reports, with category. No user fields |
| Stored procedure | `dbo.sp_save_report` | Saves one report. Takes JSON for the ingredients, nutrition and per-ingredient ratings |
| Transaction | inside `sp_save_report` | One transaction creates the product if missing, then the report, its items and an audit row. Any failure rolls everything back |
| Trigger | `dbo.trg_ingredients_audit` | After an update on `ingredients`, writes a row to `audit_log` when the rating, text, review flag or source changed, and sets `updated_at`. This replaces an admin screen for tracking manual corrections |
| Roles | `app_rw`, `analytics_reader` | The app can read and write the base tables and run procedures, but cannot update or delete audit rows. The analytics role can only read the `analytics` schema |

**Concurrency:** `sp_save_report` reads the product row with `UPDLOCK, HOLDLOCK`, so two users scanning the same new product at once do not create two rows.

### Indexes

| Index | Why |
| --- | --- |
| `ingredients(normalized_name)` unique | Ingredient lookup on every scan |
| `ingredient_aliases(alias_normalized)` unique | Alias and E-number lookup |
| `products(product_hash)` unique | Product reuse check |
| `reports(user_id, created_at DESC)` | History list for a user |
| `reports(product_id)` | Foreign key lookups |
| `product_ingredients(ingredient_id)` | Finding products by ingredient |
| `report_items(ingredient_id)` | Analytics by ingredient |
| `scan_events(occurred_at)` | Date range analytics |
| `otp_requests(phone_number, created_at DESC)` | Rate limit and verification lookup |
| `refresh_tokens(user_id)` | Revoking a user's tokens |
| `audit_log(created_at)` | Reviewing recent activity |

## 9. Analytics layer (replaceable)

Power BI is not confirmed. To keep the choice open:

- Dashboards read only `analytics.*` views, through a read-only database role. The application tables are never exposed.
- A different tool (Metabase, Excel, Grafana, or a Power BI report file with screenshots) can use the same views unchanged.
- To add or change a chart, edit or add a view; no table changes are needed.
- The views contain no phone numbers, user IDs or free text typed by users.

Once your Power BI access is confirmed, the views can be kept as they are or adjusted to what the report needs.

## 10. Seed data

**Lookup seed** is inside `schema.sql`: roles, age groups, ratings, product types, ingredient categories, nutrients, health conditions, allergens, skin types and dietary preferences.

**Age-group limits** are not filled in. The structure is ready, but the numbers must come from a published source you can cite (for example WHO, ICMR-NIN or FSSAI guidance) and be checked by you. Do not use unchecked numbers; the report will state the source in `source_note`.

**Ingredient seed (200 to 250 rows)** is a separate step after the folder structure. The format is one CSV row per ingredient, loaded into `dbo.stg_ingredient_seed` and then into the final tables:

```
name,category,base_rating,uses,disadvantages,allergens,age_exceptions,condition_risks,aliases
sugar,sweetener,adjustable,Adds sweetness and energy,Raises blood sugar; too much harms teeth,,child:risk|old_age:adjustable,diabetes:risk,sucrose|cane sugar
sodium benzoate,preservative,adjustable,Stops mould and bacteria,Can irritate sensitive people,,child:risk,,e211
water,other,safe,Base ingredient,,,,,aqua|purified water
```

These three rows only show the format; the ratings are examples and must be reviewed. Rules: codes must match the lookup tables; several values in one cell are separated by `|`; an exception is written as `age_group:rating` and a condition risk as `condition:rating`; names are written in the normalised form (lower case, no percentages or brackets).

**One normalisation function.** The backend and the seed loader must use the same function to produce `normalized_name`, or lookups will miss. Write it once in the backend and reuse it in the seed script.

## 11. Sample queries (`queries.sql`)

1. Match extracted names to ingredients and aliases
2. List unknown ingredients (to send to AI)
3. Product reuse check by hash
4. Personalised ratings for a user (joins, `OUTER APPLY`, `VALUES`)
5. The same for a guest, from JSON parameters
6. Consumption guidance, with the limiting nutrient
7. Call `sp_save_report` inside a transaction (sample JSON)
8. History page for a user (`OFFSET` and `FETCH`)
9. One full report by `public_id`, owned by the user
10. Pie chart data: rating share and category share for a report
11. Top risky ingredients with `DENSE_RANK` (from the view)
12. Scans per day, guest versus user, average duration and cache-hit rate
13. AI-added ingredients waiting for review
14. Trigger demonstration and audit rows
15. Account deletion and cascade check
16. OTP cleanup

## 12. Security and privacy in the database

- Label images are never stored; OTPs and refresh tokens are stored only as hashes.
- Reports are addressed by a random `public_id`, and every query that reads a report also filters by `user_id`.
- Every query from the app uses parameters. The one place JSON is parsed (`sp_save_report`) validates it first.
- `app_rw` is denied update and delete on `audit_log`.
- The analytics role sees aggregates only.
- The Azure SQL firewall allows only the backend and your development IPs (see the TRD).
- Use fictional phone numbers and profiles in all test data, as the university guide requires.

## 13. DP-900 mapping

| Item | In ScanWise |
| --- | --- |
| Structured data | All Azure SQL tables |
| Semi-structured data | Raw Gemini JSON per scan in Cosmos DB (30-day TTL), plus the JSON passed to `sp_save_report` |
| Unstructured data | The label image, processed in memory and never stored |
| Relational service | Azure SQL Database |
| Non-relational service | Azure Cosmos DB |
| Analytics | Views in the `analytics` schema, with a dashboard tool still to be confirmed |

## 14. Open items

1. **Power BI:** access to be confirmed. The analytics layer is built to survive a change of tool.
2. **Phone number storage:** to be discussed. Only `users.phone_number` and `otp_requests.phone_number` change.
3. **OTP provider:** to be decided. The tables do not depend on it.
4. **Age-group limit numbers:** to be sourced and checked by you before the demo.
5. **`days_per_week` rule:** confirm how it is calculated.
6. **Verdict thresholds** (score ranges for good, okay and avoid) are set in the application code; define them in the backend design.
7. **Azure SQL free or serverless tiers can pause when idle**, and the first query after a pause can be slow. Check this on your student plan and warm the database before demos, because speed is one of your success measures.
