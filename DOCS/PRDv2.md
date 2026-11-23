# ScanWise — Product Requirements Document (PRD)

Version 3.0 · Local SQL & Zero External Cloud Architecture Update · Status: Production-Ready MVP

## 1. Overview

**ScanWise** is a mobile-first web app that reads the *back label* of a packaged product (ingredient list, nutrition, and back paragraphs), uses Gemini AI to extract and analyze it, and returns a clean, instant visual report: safe / adjustable / risk ratings for each ingredient, interactive charts, and age-tailored consumption guidance.

It works for eatables (food/beverages) and skincare products.

**Architecture Highlight:**
The database is fully self-contained using **embedded SQL (SQLite)** within the codebase. There are **zero external cloud database dependencies** (no Azure Portal, Azure SQL, or Cosmos DB required). It runs entirely locally during development and deploys seamlessly to serverless environments (such as Vercel) while leveraging Google Gemini API with a single `GEMINI_API_KEY`.

---

## 2. Goals, Non-Goals, and Success Metrics

### 2.1 Goals
1. **Self-Contained SQL Architecture**: All tables, relations, seed data (100 verified ingredients), queries, and user states reside inside the codebase via SQL.
2. **Instant Local & Cloud Deployment**: No portal setup or manual connection strings; boots with standard Python/Vercel deployment.
3. **High-Recall Extraction**: Extract packaging text accurately using Gemini Vision.
4. **Database-First Intelligence**: Lookup known ingredients first to minimize AI latency and cost; call Gemini only for newly discovered ingredients.
5. **Clear, Accessible Reports**: Understandable in under 10 seconds through visual color tags, pie charts, and personalized verdicts.

### 2.2 Non-Goals
- External database services (Azure SQL, Cosmos DB, AWS RDS)
- Front-of-pack barcode scanning (focuses on back label ingredient lists)
- Clinical medical advice or diagnosis

---

## 3. Users and Roles

- **Guest**: Can test scans immediately without signing up. Receives personalized assessment based on in-session age/condition selections.
- **User**: Authenticates via mobile number and fast OTP (with local dev OTP support). Preserves personalized health questionnaire and history of scanned reports.

---

## 4. Core Features

### F1. Product Label Scanning
- Camera capture in browser or image upload (JPG, PNG, WebP up to 5 MB).
- Validates file header and re-encodes via Pillow in memory. Images are never persisted to disk.

### F2. Gemini AI Ingredient Extraction
- Multimodal extraction using Gemini (`gemini-2.0-flash`).
- Extracts product name, product type (food, drink, skincare, other), full ingredient list, and nutritional data.
- Allows user review/edit on screen before final analysis.

### F3. Self-Contained SQL Ingredient Analysis (100 Seed Ingredients)
- Database starts pre-seeded with 100 common food and cosmetic ingredients and their aliases, allergen links, age ratings, and condition risks.
- Unknown ingredients are batched and analyzed by Gemini, then dynamically saved to the SQL database with source `ai`.

### F4. Personalized Health Insights
- Real-time rating adjustments based on user's profile:
  - Age group (child, teen, adult, old age)
  - Medical conditions (diabetes, hypertension, heart disease, kidney disease, etc.)
  - Allergens (peanut, milk, soy, gluten, etc.)
  - Skin types (sensitive, oily, dry, combination)
- Consumption guidance calculates safe daily/weekly servings from nutrition data.

### F5. Visual Product Report
- Verdict summary card: *Good for you*, *Okay in limits*, or *Better avoided*.
- Rating breakdown & Category distribution charts.
- Detailed ingredient breakdown with collapsible uses & disadvantages.

---

## 5. Data & Storage Model

All data is structured in relational SQL tables initialized automatically:
- **Lookup Tables**: `roles`, `age_groups`, `ratings`, `product_types`, `ingredient_categories`, `nutrients`, `health_conditions`, `allergens`, `skin_types`, `dietary_preferences`.
- **Knowledge Base**: `ingredients` (100 seed items), `ingredient_aliases`, `ingredient_age_ratings`, `ingredient_allergens`, `ingredient_condition_risks`, `age_group_limits`.
- **User & Reports**: `users`, `user_profiles`, `user_conditions`, `user_allergens`, `products`, `product_ingredients`, `product_nutrition`, `reports`, `report_items`.
- **Operations & Security**: `otp_requests`, `refresh_tokens`, `audit_log`, `scan_events`.

---

## 6. Environment & Configuration

Only one external API credential is required:
- `GEMINI_API_KEY`: Google Gemini API key.
- Database runs locally at `instance/scanwise.db` or in-memory for tests.
