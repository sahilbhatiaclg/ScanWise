#!/bin/bash
# Recreates the ScanWise project skeleton. Run from the folder that should CONTAIN 'project/'.
# It skips files that already exist, so your readme.md, PRD, TRD and SRD are never overwritten.
set -e
mkdir -p project
cd project

mkdir -p 'DOCS'
if [ ! -e 'DOCS/architecture.md' ]; then
  cat > 'DOCS/architecture.md' <<'SCANWISE_EOF'
Architecture diagram and short notes (components and data flow), exported from the TRD.
Required for the design review.
SCANWISE_EOF
fi
mkdir -p 'DOCS'
if [ ! -e 'DOCS/threat-model.md' ]; then
  cat > 'DOCS/threat-model.md' <<'SCANWISE_EOF'
One-page threat model (STRIDE table): assets, entry points, threats, mitigations.
Required for the design review (19 Oct).
SCANWISE_EOF
fi
mkdir -p 'DOCS'
if [ ! -e 'DOCS/security-checklist.md' ]; then
  cat > 'DOCS/security-checklist.md' <<'SCANWISE_EOF'
Completed Cloud Security checklist with evidence for each control.
Required for the security check (3 Nov).
SCANWISE_EOF
fi
mkdir -p 'DOCS'
if [ ! -e 'DOCS/data-classification.md' ]; then
  cat > 'DOCS/data-classification.md' <<'SCANWISE_EOF'
DP-900 note: structured, semi-structured and unstructured data in ScanWise, and the Azure services used.
SCANWISE_EOF
fi
mkdir -p 'DOCS'
if [ ! -e 'DOCS/ai-usage-declaration.md' ]; then
  cat > 'DOCS/ai-usage-declaration.md' <<'SCANWISE_EOF'
List every AI tool, library, template and dataset used, as the university guide requires for the report.
SCANWISE_EOF
fi
mkdir -p 'db'
if [ ! -e 'db/schema.sql' ]; then
  cat > 'db/schema.sql' <<'SCANWISE_EOF'
-- ScanWise schema for Azure SQL (T-SQL). Paste the full schema.sql here.
-- This file is the single source of truth for the database.
SCANWISE_EOF
fi
mkdir -p 'db'
if [ ! -e 'db/queries.sql' ]; then
  cat > 'db/queries.sql' <<'SCANWISE_EOF'
-- ScanWise sample queries for Azure SQL (T-SQL). Paste the full queries.sql here.
SCANWISE_EOF
fi
mkdir -p 'db/seed'
if [ ! -e 'db/seed/load_seed.py' ]; then
  cat > 'db/seed/load_seed.py' <<'SCANWISE_EOF'
# Loads db/seed/ingredients_seed.csv into the ingredient tables in one transaction.
# Must be re-runnable (skips names that exist) and use backend/app/utils/normalize.py.
SCANWISE_EOF
fi
mkdir -p 'backend'
if [ ! -e 'backend/wsgi.py' ]; then
  cat > 'backend/wsgi.py' <<'SCANWISE_EOF'
# Entry point for Gunicorn and Azure App Service: creates the Flask app with create_app().
SCANWISE_EOF
fi
mkdir -p 'backend'
if [ ! -e 'backend/startup.sh' ]; then
  cat > 'backend/startup.sh' <<'SCANWISE_EOF'
#!/bin/bash
# Azure App Service startup: install the Microsoft ODBC Driver 18 for SQL Server, then start Gunicorn.
# Test this on Azure in the first days.
SCANWISE_EOF
fi
mkdir -p 'backend/app'
if [ ! -e 'backend/app/__init__.py' ]; then
  cat > 'backend/app/__init__.py' <<'SCANWISE_EOF'
# Flask application factory: create_app() loads config, registers extensions, blueprints and error handlers.
SCANWISE_EOF
fi
mkdir -p 'backend/app'
if [ ! -e 'backend/app/config.py' ]; then
  cat > 'backend/app/config.py' <<'SCANWISE_EOF'
# Reads settings from environment variables (database, Cosmos, Gemini, OTP provider, limits).
# No secrets in this file.
SCANWISE_EOF
fi
mkdir -p 'backend/app'
if [ ! -e 'backend/app/extensions.py' ]; then
  cat > 'backend/app/extensions.py' <<'SCANWISE_EOF'
# Shared objects created once: SQLAlchemy engine, rate limiter, JWT manager, CORS and security headers.
SCANWISE_EOF
fi
mkdir -p 'backend/app'
if [ ! -e 'backend/app/db.py' ]; then
  cat > 'backend/app/db.py' <<'SCANWISE_EOF'
# Small helpers to run parameterised text() SQL and the sp_save_report procedure through SQLAlchemy.
# No model classes: db/schema.sql is the source of truth.
SCANWISE_EOF
fi
mkdir -p 'backend/app'
if [ ! -e 'backend/app/cli.py' ]; then
  cat > 'backend/app/cli.py' <<'SCANWISE_EOF'
# Flask CLI commands, for example: flask seed-ingredients, flask cleanup-otp.
SCANWISE_EOF
fi
mkdir -p 'backend/app/api'
if [ ! -e 'backend/app/api/__init__.py' ]; then
  cat > 'backend/app/api/__init__.py' <<'SCANWISE_EOF'
# Registers all API blueprints under /api.
SCANWISE_EOF
fi
mkdir -p 'backend/app/api'
if [ ! -e 'backend/app/api/auth.py' ]; then
  cat > 'backend/app/api/auth.py' <<'SCANWISE_EOF'
# Routes: POST /auth/guest, /auth/otp/request, /auth/otp/verify, /auth/refresh, /auth/logout.
SCANWISE_EOF
fi
mkdir -p 'backend/app/api'
if [ ! -e 'backend/app/api/profile.py' ]; then
  cat > 'backend/app/api/profile.py' <<'SCANWISE_EOF'
# Routes: GET and PUT /profile (age group, conditions, allergies, skin type, diet). Users only.
SCANWISE_EOF
fi
mkdir -p 'backend/app/api'
if [ ! -e 'backend/app/api/scans.py' ]; then
  cat > 'backend/app/api/scans.py' <<'SCANWISE_EOF'
# Routes: POST /scans, PATCH /scans/:id, POST /scans/:id/analyze. Guests and users.
SCANWISE_EOF
fi
mkdir -p 'backend/app/api'
if [ ! -e 'backend/app/api/reports.py' ]; then
  cat > 'backend/app/api/reports.py' <<'SCANWISE_EOF'
# Routes: GET /reports, GET and DELETE /reports/:id, DELETE /account. Users only.
SCANWISE_EOF
fi
mkdir -p 'backend/app/api'
if [ ! -e 'backend/app/api/health.py' ]; then
  cat > 'backend/app/api/health.py' <<'SCANWISE_EOF'
# Route: GET /health (liveness check, no authentication).
SCANWISE_EOF
fi
mkdir -p 'backend/app/services'
if [ ! -e 'backend/app/services/otp_service.py' ]; then
  cat > 'backend/app/services/otp_service.py' <<'SCANWISE_EOF'
# OtpProvider interface plus MockOtpProvider for development.
# The real SMS provider (not decided yet) plugs in here later.
SCANWISE_EOF
fi
mkdir -p 'backend/app/services'
if [ ! -e 'backend/app/services/token_service.py' ]; then
  cat > 'backend/app/services/token_service.py' <<'SCANWISE_EOF'
# Creates and verifies access, refresh and guest tokens; stores only token hashes.
SCANWISE_EOF
fi
mkdir -p 'backend/app/services'
if [ ! -e 'backend/app/services/extraction_service.py' ]; then
  cat > 'backend/app/services/extraction_service.py' <<'SCANWISE_EOF'
# Sends the label image to Gemini, validates the JSON result, handles retry and timeout.
# The image stays in memory and is never stored.
SCANWISE_EOF
fi
mkdir -p 'backend/app/services'
if [ ! -e 'backend/app/services/ingredient_service.py' ]; then
  cat > 'backend/app/services/ingredient_service.py' <<'SCANWISE_EOF'
# Database-first ingredient lookup; sends only unknown ingredients to Gemini in one batch and saves them (source = ai).
SCANWISE_EOF
fi
mkdir -p 'backend/app/services'
if [ ! -e 'backend/app/services/personalization_service.py' ]; then
  cat > 'backend/app/services/personalization_service.py' <<'SCANWISE_EOF'
# Applies the user's or guest's profile to ingredient ratings and builds the verdict and score.
# Deterministic rules, no AI call.
SCANWISE_EOF
fi
mkdir -p 'backend/app/services'
if [ ! -e 'backend/app/services/guidance_service.py' ]; then
  cat > 'backend/app/services/guidance_service.py' <<'SCANWISE_EOF'
# Consumption guidance: servings per day and days per week from age_group_limits, with a labelled AI estimate as fallback.
SCANWISE_EOF
fi
mkdir -p 'backend/app/services'
if [ ! -e 'backend/app/services/report_service.py' ]; then
  cat > 'backend/app/services/report_service.py' <<'SCANWISE_EOF'
# Builds the report and saves it through sp_save_report for logged-in users; guests get the report without saving.
SCANWISE_EOF
fi
mkdir -p 'backend/app/services'
if [ ! -e 'backend/app/services/cosmos_service.py' ]; then
  cat > 'backend/app/services/cosmos_service.py' <<'SCANWISE_EOF'
# Writes the raw Gemini JSON for each scan to Azure Cosmos DB (30-day TTL).
SCANWISE_EOF
fi
mkdir -p 'backend/app/repositories'
if [ ! -e 'backend/app/repositories/user_repo.py' ]; then
  cat > 'backend/app/repositories/user_repo.py' <<'SCANWISE_EOF'
# SQL for users, login lookup, last_login_at and account deletion.
SCANWISE_EOF
fi
mkdir -p 'backend/app/repositories'
if [ ! -e 'backend/app/repositories/profile_repo.py' ]; then
  cat > 'backend/app/repositories/profile_repo.py' <<'SCANWISE_EOF'
# SQL for user_profiles, user_conditions and user_allergens.
SCANWISE_EOF
fi
mkdir -p 'backend/app/repositories'
if [ ! -e 'backend/app/repositories/ingredient_repo.py' ]; then
  cat > 'backend/app/repositories/ingredient_repo.py' <<'SCANWISE_EOF'
# SQL for ingredients, aliases, age ratings, condition risks and allergens.
SCANWISE_EOF
fi
mkdir -p 'backend/app/repositories'
if [ ! -e 'backend/app/repositories/product_repo.py' ]; then
  cat > 'backend/app/repositories/product_repo.py' <<'SCANWISE_EOF'
# SQL for products, product_ingredients, product_nutrition and the product hash lookup.
SCANWISE_EOF
fi
mkdir -p 'backend/app/repositories'
if [ ! -e 'backend/app/repositories/report_repo.py' ]; then
  cat > 'backend/app/repositories/report_repo.py' <<'SCANWISE_EOF'
# SQL for reports and report_items: history list, one report, delete, and the pie-chart counts.
SCANWISE_EOF
fi
mkdir -p 'backend/app/repositories'
if [ ! -e 'backend/app/repositories/log_repo.py' ]; then
  cat > 'backend/app/repositories/log_repo.py' <<'SCANWISE_EOF'
# SQL for audit_log and scan_events, plus otp_requests and refresh_tokens housekeeping.
SCANWISE_EOF
fi
mkdir -p 'backend/app/schemas'
if [ ! -e 'backend/app/schemas/auth.py' ]; then
  cat > 'backend/app/schemas/auth.py' <<'SCANWISE_EOF'
# Pydantic models for login and token requests and responses.
SCANWISE_EOF
fi
mkdir -p 'backend/app/schemas'
if [ ! -e 'backend/app/schemas/profile.py' ]; then
  cat > 'backend/app/schemas/profile.py' <<'SCANWISE_EOF'
# Pydantic models for the profile and the guest's temporary profile.
SCANWISE_EOF
fi
mkdir -p 'backend/app/schemas'
if [ ! -e 'backend/app/schemas/scan.py' ]; then
  cat > 'backend/app/schemas/scan.py' <<'SCANWISE_EOF'
# Pydantic models for the extracted label JSON from Gemini, corrections and the analyze request.
SCANWISE_EOF
fi
mkdir -p 'backend/app/schemas'
if [ ! -e 'backend/app/schemas/report.py' ]; then
  cat > 'backend/app/schemas/report.py' <<'SCANWISE_EOF'
# Pydantic models for the report, report items and history list responses.
SCANWISE_EOF
fi
mkdir -p 'backend/app/security'
if [ ! -e 'backend/app/security/decorators.py' ]; then
  cat > 'backend/app/security/decorators.py' <<'SCANWISE_EOF'
# Role decorators (guest, user) applied to every route, per the TRD security design.
SCANWISE_EOF
fi
mkdir -p 'backend/app/security'
if [ ! -e 'backend/app/security/image_validation.py' ]; then
  cat > 'backend/app/security/image_validation.py' <<'SCANWISE_EOF'
# Checks size and file signature, then re-encodes the image with Pillow before it goes to Gemini.
SCANWISE_EOF
fi
mkdir -p 'backend/app/security'
if [ ! -e 'backend/app/security/rate_limits.py' ]; then
  cat > 'backend/app/security/rate_limits.py' <<'SCANWISE_EOF'
# Rate-limit rules: OTP, guest start, scans (guest 5 per day, user 30 per day proposed), analyze.
SCANWISE_EOF
fi
mkdir -p 'backend/app/utils'
if [ ! -e 'backend/app/utils/normalize.py' ]; then
  cat > 'backend/app/utils/normalize.py' <<'SCANWISE_EOF'
# THE one ingredient-name normaliser and product-hash function.
# Used by the scan pipeline and the seed loader, so lookups always match.
SCANWISE_EOF
fi
mkdir -p 'backend/app/utils'
if [ ! -e 'backend/app/utils/hashing.py' ]; then
  cat > 'backend/app/utils/hashing.py' <<'SCANWISE_EOF'
# Helpers for hashing OTPs and tokens and for masking phone numbers in logs.
SCANWISE_EOF
fi
mkdir -p 'backend/app/utils'
if [ ! -e 'backend/app/utils/errors.py' ]; then
  cat > 'backend/app/utils/errors.py' <<'SCANWISE_EOF'
# Error classes and the single error response shape: { error: { code, message } }.
SCANWISE_EOF
fi
mkdir -p 'backend/app/utils'
if [ ! -e 'backend/app/utils/log_setup.py' ]; then
  cat > 'backend/app/utils/log_setup.py' <<'SCANWISE_EOF'
# Logging setup and Application Insights hookup; phone numbers are always masked.
SCANWISE_EOF
fi
mkdir -p 'backend/tests'
if [ ! -e 'backend/tests/conftest.py' ]; then
  cat > 'backend/tests/conftest.py' <<'SCANWISE_EOF'
# Shared pytest fixtures: test app, test client, fake Gemini client, mock OTP provider.
SCANWISE_EOF
fi
mkdir -p 'backend/tests'
if [ ! -e 'backend/tests/test_normalize.py' ]; then
  cat > 'backend/tests/test_normalize.py' <<'SCANWISE_EOF'
# Tests for ingredient-name normalisation and the product hash.
SCANWISE_EOF
fi
mkdir -p 'backend/tests'
if [ ! -e 'backend/tests/test_personalization.py' ]; then
  cat > 'backend/tests/test_personalization.py' <<'SCANWISE_EOF'
# Tests for rating rules: age exceptions, condition risks, allergens, verdict thresholds.
SCANWISE_EOF
fi
mkdir -p 'backend/tests'
if [ ! -e 'backend/tests/test_auth.py' ]; then
  cat > 'backend/tests/test_auth.py' <<'SCANWISE_EOF'
# Tests for OTP login, guest tokens, role checks and expired tokens.
SCANWISE_EOF
fi
mkdir -p 'backend/tests'
if [ ! -e 'backend/tests/test_scans.py' ]; then
  cat > 'backend/tests/test_scans.py' <<'SCANWISE_EOF'
# Tests for upload validation, extraction failures and the analyze flow.
SCANWISE_EOF
fi
mkdir -p 'backend/tests'
if [ ! -e 'backend/tests/test_reports.py' ]; then
  cat > 'backend/tests/test_reports.py' <<'SCANWISE_EOF'
# Tests that users can only read their own reports and that account deletion cascades.
SCANWISE_EOF
fi
mkdir -p 'frontend'
if [ ! -e 'frontend/vite.config.js' ]; then
  cat > 'frontend/vite.config.js' <<'SCANWISE_EOF'
// Vite configuration: React plugin and the dev proxy to the Flask API.
SCANWISE_EOF
fi
mkdir -p 'frontend'
if [ ! -e 'frontend/tailwind.config.js' ]; then
  cat > 'frontend/tailwind.config.js' <<'SCANWISE_EOF'
// Tailwind configuration: content paths and the ScanWise colour tokens (safe, adjustable, risk).
SCANWISE_EOF
fi
mkdir -p 'frontend'
if [ ! -e 'frontend/postcss.config.js' ]; then
  cat > 'frontend/postcss.config.js' <<'SCANWISE_EOF'
// PostCSS configuration for Tailwind.
SCANWISE_EOF
fi
mkdir -p 'frontend/src'
if [ ! -e 'frontend/src/main.jsx' ]; then
  cat > 'frontend/src/main.jsx' <<'SCANWISE_EOF'
// React entry point: mounts <App /> and global providers.
SCANWISE_EOF
fi
mkdir -p 'frontend/src'
if [ ! -e 'frontend/src/App.jsx' ]; then
  cat > 'frontend/src/App.jsx' <<'SCANWISE_EOF'
// Top-level component: router, auth provider and app shell.
SCANWISE_EOF
fi
mkdir -p 'frontend/src'
if [ ! -e 'frontend/src/index.css' ]; then
  cat > 'frontend/src/index.css' <<'SCANWISE_EOF'
/* Tailwind directives and global styles. */
SCANWISE_EOF
fi
mkdir -p 'frontend/src/routes'
if [ ! -e 'frontend/src/routes/index.jsx' ]; then
  cat > 'frontend/src/routes/index.jsx' <<'SCANWISE_EOF'
// Route table: Welcome, Login, Onboarding, Home, Review, Report, History, Profile.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/routes'
if [ ! -e 'frontend/src/routes/ProtectedRoute.jsx' ]; then
  cat > 'frontend/src/routes/ProtectedRoute.jsx' <<'SCANWISE_EOF'
// Blocks guests from profile and history, and sends them to login.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/context'
if [ ! -e 'frontend/src/context/AuthContext.jsx' ]; then
  cat > 'frontend/src/context/AuthContext.jsx' <<'SCANWISE_EOF'
// Holds the current role (guest or user) and the access token in memory; handles silent refresh.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/hooks'
if [ ! -e 'frontend/src/hooks/useAuth.js' ]; then
  cat > 'frontend/src/hooks/useAuth.js' <<'SCANWISE_EOF'
// Hook for login, guest start, logout and role checks.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/hooks'
if [ ! -e 'frontend/src/hooks/useScan.js' ]; then
  cat > 'frontend/src/hooks/useScan.js' <<'SCANWISE_EOF'
// Hook for the scan flow: upload, extracted text, corrections, analyze, progress stages.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/hooks'
if [ ! -e 'frontend/src/hooks/useReports.js' ]; then
  cat > 'frontend/src/hooks/useReports.js' <<'SCANWISE_EOF'
// Hook for the history list, one report and delete (TanStack Query).
SCANWISE_EOF
fi
mkdir -p 'frontend/src/hooks'
if [ ! -e 'frontend/src/hooks/useProfile.js' ]; then
  cat > 'frontend/src/hooks/useProfile.js' <<'SCANWISE_EOF'
// Hook to read and update the profile (user) or hold temporary choices (guest).
SCANWISE_EOF
fi
mkdir -p 'frontend/src/lib'
if [ ! -e 'frontend/src/lib/imageCompress.js' ]; then
  cat > 'frontend/src/lib/imageCompress.js' <<'SCANWISE_EOF'
// Resizes and compresses the photo (longest side about 1600 px) before upload.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/lib'
if [ ! -e 'frontend/src/lib/constants.js' ]; then
  cat > 'frontend/src/lib/constants.js' <<'SCANWISE_EOF'
// Age groups, conditions, allergens and other fixed lists used by the UI.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/lib'
if [ ! -e 'frontend/src/lib/ratingStyles.js' ]; then
  cat > 'frontend/src/lib/ratingStyles.js' <<'SCANWISE_EOF'
// Maps safe, adjustable and risk to label, icon and colour (never colour alone).
SCANWISE_EOF
fi
mkdir -p 'frontend/src/api'
if [ ! -e 'frontend/src/api/client.js' ]; then
  cat > 'frontend/src/api/client.js' <<'SCANWISE_EOF'
// Fetch wrapper: base URL, auth header, error shape. Returns mock data when VITE_USE_MOCK=true.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/api'
if [ ! -e 'frontend/src/api/auth.js' ]; then
  cat > 'frontend/src/api/auth.js' <<'SCANWISE_EOF'
// API calls for guest start, OTP request and verify, refresh and logout.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/api'
if [ ! -e 'frontend/src/api/profile.js' ]; then
  cat > 'frontend/src/api/profile.js' <<'SCANWISE_EOF'
// API calls for GET and PUT /profile.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/api'
if [ ! -e 'frontend/src/api/scans.js' ]; then
  cat > 'frontend/src/api/scans.js' <<'SCANWISE_EOF'
// API calls for upload, corrections and analyze.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/api'
if [ ! -e 'frontend/src/api/reports.js' ]; then
  cat > 'frontend/src/api/reports.js' <<'SCANWISE_EOF'
// API calls for the history list, one report, delete report and delete account.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/mocks'
if [ ! -e 'frontend/src/mocks/index.js' ]; then
  cat > 'frontend/src/mocks/index.js' <<'SCANWISE_EOF'
// Mock switch: maps each API path to its sample JSON so the UI works before the backend is ready.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/pages'
if [ ! -e 'frontend/src/pages/Welcome.jsx' ]; then
  cat > 'frontend/src/pages/Welcome.jsx' <<'SCANWISE_EOF'
// Welcome screen: log in with OTP or continue as a guest.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/pages'
if [ ! -e 'frontend/src/pages/Login.jsx' ]; then
  cat > 'frontend/src/pages/Login.jsx' <<'SCANWISE_EOF'
// Mobile number and OTP screens, with the consent notice.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/pages'
if [ ! -e 'frontend/src/pages/Onboarding.jsx' ]; then
  cat > 'frontend/src/pages/Onboarding.jsx' <<'SCANWISE_EOF'
// One-time health questions: age group, conditions, allergies, skin type, diet.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/pages'
if [ ! -e 'frontend/src/pages/Home.jsx' ]; then
  cat > 'frontend/src/pages/Home.jsx' <<'SCANWISE_EOF'
// Scan screen: camera capture or upload, plus the guest banner.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/pages'
if [ ! -e 'frontend/src/pages/ReviewExtracted.jsx' ]; then
  cat > 'frontend/src/pages/ReviewExtracted.jsx' <<'SCANWISE_EOF'
// Shows the extracted ingredients so the user can correct them before analysis.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/pages'
if [ ! -e 'frontend/src/pages/Report.jsx' ]; then
  cat > 'frontend/src/pages/Report.jsx' <<'SCANWISE_EOF'
// The main report: verdict, pie charts, ingredient list, consumption guidance, disclaimer.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/pages'
if [ ! -e 'frontend/src/pages/History.jsx' ]; then
  cat > 'frontend/src/pages/History.jsx' <<'SCANWISE_EOF'
// List of saved reports (users only) with date, name and verdict.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/pages'
if [ ! -e 'frontend/src/pages/Profile.jsx' ]; then
  cat > 'frontend/src/pages/Profile.jsx' <<'SCANWISE_EOF'
// View and edit the health profile; delete account.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/pages'
if [ ! -e 'frontend/src/pages/NotFound.jsx' ]; then
  cat > 'frontend/src/pages/NotFound.jsx' <<'SCANWISE_EOF'
// Fallback page for unknown routes.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/components/layout'
if [ ! -e 'frontend/src/components/layout/AppShell.jsx' ]; then
  cat > 'frontend/src/components/layout/AppShell.jsx' <<'SCANWISE_EOF'
// Page frame: header, content area and bottom navigation.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/components/layout'
if [ ! -e 'frontend/src/components/layout/BottomNav.jsx' ]; then
  cat > 'frontend/src/components/layout/BottomNav.jsx' <<'SCANWISE_EOF'
// Mobile bottom navigation: Scan, History, Profile.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/components/scan'
if [ ! -e 'frontend/src/components/scan/CameraCapture.jsx' ]; then
  cat > 'frontend/src/components/scan/CameraCapture.jsx' <<'SCANWISE_EOF'
// Camera capture using a file input with capture set to the rear camera.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/components/scan'
if [ ! -e 'frontend/src/components/scan/UploadButton.jsx' ]; then
  cat > 'frontend/src/components/scan/UploadButton.jsx' <<'SCANWISE_EOF'
// Upload an existing photo as a fallback to the camera.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/components/scan'
if [ ! -e 'frontend/src/components/scan/ProgressStages.jsx' ]; then
  cat > 'frontend/src/components/scan/ProgressStages.jsx' <<'SCANWISE_EOF'
// Staged progress text: Reading label, Checking ingredients, Building report.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/components/report'
if [ ! -e 'frontend/src/components/report/VerdictCard.jsx' ]; then
  cat > 'frontend/src/components/report/VerdictCard.jsx' <<'SCANWISE_EOF'
// Top card with the overall verdict and one-line reason.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/components/report'
if [ ! -e 'frontend/src/components/report/RatingPieChart.jsx' ]; then
  cat > 'frontend/src/components/report/RatingPieChart.jsx' <<'SCANWISE_EOF'
// Pie chart of safe, adjustable and risk ingredient counts (Recharts).
SCANWISE_EOF
fi
mkdir -p 'frontend/src/components/report'
if [ ! -e 'frontend/src/components/report/CategoryPieChart.jsx' ]; then
  cat > 'frontend/src/components/report/CategoryPieChart.jsx' <<'SCANWISE_EOF'
// Pie chart of ingredient categories (Recharts).
SCANWISE_EOF
fi
mkdir -p 'frontend/src/components/report'
if [ ! -e 'frontend/src/components/report/IngredientList.jsx' ]; then
  cat > 'frontend/src/components/report/IngredientList.jsx' <<'SCANWISE_EOF'
// Ingredients grouped by age group with safe, adjustable and risk signs; details open on tap.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/components/report'
if [ ! -e 'frontend/src/components/report/ConsumptionCard.jsx' ]; then
  cat > 'frontend/src/components/report/ConsumptionCard.jsx' <<'SCANWISE_EOF'
// Servings per day and days per week, with the labelled estimate when AI-based.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/components/report'
if [ ! -e 'frontend/src/components/report/Disclaimer.jsx' ]; then
  cat > 'frontend/src/components/report/Disclaimer.jsx' <<'SCANWISE_EOF'
// The always-visible not-medical-advice notice.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/components/common'
if [ ! -e 'frontend/src/components/common/Button.jsx' ]; then
  cat > 'frontend/src/components/common/Button.jsx' <<'SCANWISE_EOF'
// Shared button component.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/components/common'
if [ ! -e 'frontend/src/components/common/Spinner.jsx' ]; then
  cat > 'frontend/src/components/common/Spinner.jsx' <<'SCANWISE_EOF'
// Shared loading indicator.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/components/common'
if [ ! -e 'frontend/src/components/common/ErrorState.jsx' ]; then
  cat > 'frontend/src/components/common/ErrorState.jsx' <<'SCANWISE_EOF'
// Friendly error and empty states (bad image, no ingredients, offline).
SCANWISE_EOF
fi
mkdir -p 'frontend/src/components/common'
if [ ! -e 'frontend/src/components/common/GuestBanner.jsx' ]; then
  cat > 'frontend/src/components/common/GuestBanner.jsx' <<'SCANWISE_EOF'
// Banner that invites guests to log in to save reports and personalise.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/components/common'
if [ ! -e 'frontend/src/components/common/ConsentNotice.jsx' ]; then
  cat > 'frontend/src/components/common/ConsentNotice.jsx' <<'SCANWISE_EOF'
// Consent and privacy notice shown at signup.
SCANWISE_EOF
fi
mkdir -p 'frontend/src/mocks/data'
if [ ! -e 'frontend/src/mocks/data/guestSession.json' ]; then
  cat > 'frontend/src/mocks/data/guestSession.json' <<'SCANWISE_EOF'
{
  "_comment": "Sample response for POST /auth/guest."
}
SCANWISE_EOF
fi
mkdir -p 'frontend/src/mocks/data'
if [ ! -e 'frontend/src/mocks/data/otpRequest.json' ]; then
  cat > 'frontend/src/mocks/data/otpRequest.json' <<'SCANWISE_EOF'
{
  "_comment": "Sample response for POST /auth/otp/request and /auth/otp/verify."
}
SCANWISE_EOF
fi
mkdir -p 'frontend/src/mocks/data'
if [ ! -e 'frontend/src/mocks/data/profile.json' ]; then
  cat > 'frontend/src/mocks/data/profile.json' <<'SCANWISE_EOF'
{
  "_comment": "Sample response for GET /profile (fictional data only)."
}
SCANWISE_EOF
fi
mkdir -p 'frontend/src/mocks/data'
if [ ! -e 'frontend/src/mocks/data/scanExtracted.json' ]; then
  cat > 'frontend/src/mocks/data/scanExtracted.json' <<'SCANWISE_EOF'
{
  "_comment": "Sample response for POST /scans: extracted label JSON."
}
SCANWISE_EOF
fi
mkdir -p 'frontend/src/mocks/data'
if [ ! -e 'frontend/src/mocks/data/report.json' ]; then
  cat > 'frontend/src/mocks/data/report.json' <<'SCANWISE_EOF'
{
  "_comment": "Sample response for POST /scans/:id/analyze and GET /reports/:id."
}
SCANWISE_EOF
fi
mkdir -p 'frontend/src/mocks/data'
if [ ! -e 'frontend/src/mocks/data/reportsList.json' ]; then
  cat > 'frontend/src/mocks/data/reportsList.json' <<'SCANWISE_EOF'
{
  "_comment": "Sample response for GET /reports."
}
SCANWISE_EOF
fi
mkdir -p 'frontend/public'
if [ ! -e 'frontend/public/manifest.webmanifest' ]; then
  cat > 'frontend/public/manifest.webmanifest' <<'SCANWISE_EOF'
{
  "_comment": "PWA manifest: name, icons, theme colour, display standalone."
}
SCANWISE_EOF
fi
if [ ! -e '.gitignore' ]; then
  cat > '.gitignore' <<'SCANWISE_EOF'
# Secrets and local settings
.env
*.env
!.env.example

# Python
__pycache__/
*.pyc
.venv/
venv/
.pytest_cache/

# Node
node_modules/
dist/
.vite/

# OS and editor
.DS_Store
Thumbs.db
.idea/
.vscode/

# Never commit label images or real data
uploads/
*.log
SCANWISE_EOF
fi
mkdir -p 'backend'
if [ ! -e 'backend/.env.example' ]; then
  cat > 'backend/.env.example' <<'SCANWISE_EOF'
# Copy to backend/.env and fill in. NEVER commit the real .env file.
FLASK_ENV=development
SECRET_KEY=
JWT_SECRET=

# Azure SQL through SQLAlchemy + pyodbc, for example:
# mssql+pyodbc://USER:PASSWORD@SERVER.database.windows.net:1433/DBNAME?driver=ODBC+Driver+18+for+SQL+Server
DATABASE_URL=

# Cosmos DB (raw AI JSON)
COSMOS_ENDPOINT=
COSMOS_KEY=
COSMOS_DATABASE=
COSMOS_CONTAINER=

# Gemini
GEMINI_API_KEY=
GEMINI_MODEL=

# OTP provider: mock for development (real provider still to be decided)
OTP_PROVIDER=mock

# Limits (proposed)
GUEST_SCANS_PER_DAY=5
USER_SCANS_PER_DAY=30

# Deployment
ALLOWED_ORIGINS=http://localhost:5173
KEYVAULT_URL=
APPLICATIONINSIGHTS_CONNECTION_STRING=
SCANWISE_EOF
fi
mkdir -p 'frontend'
if [ ! -e 'frontend/.env.example' ]; then
  cat > 'frontend/.env.example' <<'SCANWISE_EOF'
# Copy to frontend/.env
VITE_API_BASE_URL=http://localhost:5000/api
# true = use sample JSON from src/mocks (no backend needed)
VITE_USE_MOCK=true
SCANWISE_EOF
fi
mkdir -p 'backend'
if [ ! -e 'backend/requirements.txt' ]; then
  cat > 'backend/requirements.txt' <<'SCANWISE_EOF'
# Install: pip install -r requirements.txt
# After the first successful install, run pip freeze and pin exact versions.
Flask
gunicorn
python-dotenv
Flask-JWT-Extended
Flask-Limiter
Flask-CORS
Flask-Talisman
pydantic
Pillow
SQLAlchemy
pyodbc
google-genai
azure-cosmos
azure-identity
azure-keyvault-secrets
azure-monitor-opentelemetry
pytest
SCANWISE_EOF
fi
mkdir -p 'frontend'
if [ ! -e 'frontend/package.json' ]; then
  cat > 'frontend/package.json' <<'SCANWISE_EOF'
{
  "name": "scanwise-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
SCANWISE_EOF
fi
mkdir -p 'frontend'
if [ ! -e 'frontend/index.html' ]; then
  cat > 'frontend/index.html' <<'SCANWISE_EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <title>ScanWise</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
SCANWISE_EOF
fi
mkdir -p 'db/seed'
if [ ! -e 'db/seed/ingredients_seed.csv' ]; then
  cat > 'db/seed/ingredients_seed.csv' <<'SCANWISE_EOF'
name,category,base_rating,uses,disadvantages,allergens,age_exceptions,condition_risks,aliases
SCANWISE_EOF
fi
mkdir -p '.github/workflows'
if [ ! -e '.github/workflows/ci.yml' ]; then
  cat > '.github/workflows/ci.yml' <<'SCANWISE_EOF'
# Placeholder CI. Replace the echo steps with real lint, pytest and build steps.
name: ci
on:
  push:
    branches: [main]
  pull_request:
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "TODO backend lint and pytest"
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "TODO frontend build"
SCANWISE_EOF
fi
if [ ! -e 'openapi.yaml' ]; then
  cat > 'openapi.yaml' <<'SCANWISE_EOF'
# ScanWise API contract OUTLINE. Fill in request and response schemas step by step.
# This file is the single source of truth for backend and frontend.
openapi: 3.0.3
info:
  title: ScanWise API
  version: 0.1.0
servers:
  - url: /api
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
paths:
  /health:
    get:
      summary: Liveness check (role: public)
      responses:
        '200':
          description: TODO
  /auth/guest:
    post:
      summary: Start a guest session (role: public)
      responses:
        '200':
          description: TODO
  /auth/otp/request:
    post:
      summary: Send an OTP (role: public)
      responses:
        '200':
          description: TODO
  /auth/otp/verify:
    post:
      summary: Verify OTP and log in (role: public)
      responses:
        '200':
          description: TODO
  /auth/refresh:
    post:
      summary: Refresh the access token (role: user)
      responses:
        '200':
          description: TODO
  /auth/logout:
    post:
      summary: Log out (role: user)
      responses:
        '200':
          description: TODO
  /profile:
    get:
      summary: Read profile (role: user)
      responses:
        '200':
          description: TODO
    put:
      summary: Update profile (role: user)
      responses:
        '200':
          description: TODO
  /scans:
    post:
      summary: Upload a label image and return extracted data (role: guest, user)
      responses:
        '200':
          description: TODO
  /scans/{id}:
    patch:
      summary: Save corrections to extracted ingredients (role: guest, user)
      responses:
        '200':
          description: TODO
  /scans/{id}/analyze:
    post:
      summary: Analyse and return the report (role: guest, user)
      responses:
        '200':
          description: TODO
  /reports:
    get:
      summary: List reports (role: user)
      responses:
        '200':
          description: TODO
  /reports/{id}:
    get:
      summary: Get one report (role: user)
      responses:
        '200':
          description: TODO
    delete:
      summary: Delete a report (role: user)
      responses:
        '200':
          description: TODO
  /account:
    delete:
      summary: Delete the account (role: user)
      responses:
        '200':
          description: TODO
SCANWISE_EOF
fi
mkdir -p 'DOCS/azure-screenshots'
if [ ! -e 'DOCS/azure-screenshots/.gitkeep' ]; then
  : > 'DOCS/azure-screenshots/.gitkeep'
fi
mkdir -p 'DOCS/analytics-report'
if [ ! -e 'DOCS/analytics-report/.gitkeep' ]; then
  : > 'DOCS/analytics-report/.gitkeep'
fi
mkdir -p 'DOCS/wireframes'
if [ ! -e 'DOCS/wireframes/.gitkeep' ]; then
  : > 'DOCS/wireframes/.gitkeep'
fi
mkdir -p 'frontend/public/icons'
if [ ! -e 'frontend/public/icons/.gitkeep' ]; then
  : > 'frontend/public/icons/.gitkeep'
fi
if [ ! -e 'PROJECT_STRUCTURE.md' ]; then
  cat > 'PROJECT_STRUCTURE.md' <<'SCANWISE_EOF'
# ScanWise - Project Structure

This file tells humans and AI coding assistants how the repository is organised. Read it before generating or changing code.

## Project in one paragraph
ScanWise is a mobile-first web app. A user (or guest) photographs the back label of a food or skincare product; the backend reads it with Gemini, checks each ingredient against an Azure SQL ingredient database (asking AI only for unknown ones), and returns a personalised report with pie charts, safe / adjustable / risk signs and consumption guidance. Label images are never stored.

## Stack
| Layer | Choice |
| --- | --- |
| Frontend | React + Vite, JavaScript (not TypeScript), Tailwind CSS, Recharts, PWA |
| Backend | Python Flask (blueprints), Gunicorn |
| Database access | SQLAlchemy used only for the engine and pooling, with plain text() SQL. No ORM model classes |
| Relational DB | Azure SQL Database (T-SQL), schema in db/schema.sql |
| Non-relational | Azure Cosmos DB (raw Gemini JSON per scan) |
| AI | Gemini API |
| Analytics | Views in the analytics schema (BI tool still to be confirmed) |
| Roles | guest and user only. No admin role in the MVP |

## Folder tree
```
project/
├── .github/
│   └── workflows/
│       └── ci.yml
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── health.py
│   │   │   ├── profile.py
│   │   │   ├── reports.py
│   │   │   └── scans.py
│   │   ├── repositories/
│   │   │   ├── ingredient_repo.py
│   │   │   ├── log_repo.py
│   │   │   ├── product_repo.py
│   │   │   ├── profile_repo.py
│   │   │   ├── report_repo.py
│   │   │   └── user_repo.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── profile.py
│   │   │   ├── report.py
│   │   │   └── scan.py
│   │   ├── security/
│   │   │   ├── decorators.py
│   │   │   ├── image_validation.py
│   │   │   └── rate_limits.py
│   │   ├── services/
│   │   │   ├── cosmos_service.py
│   │   │   ├── extraction_service.py
│   │   │   ├── guidance_service.py
│   │   │   ├── ingredient_service.py
│   │   │   ├── otp_service.py
│   │   │   ├── personalization_service.py
│   │   │   ├── report_service.py
│   │   │   └── token_service.py
│   │   ├── utils/
│   │   │   ├── errors.py
│   │   │   ├── hashing.py
│   │   │   ├── log_setup.py
│   │   │   └── normalize.py
│   │   ├── __init__.py
│   │   ├── cli.py
│   │   ├── config.py
│   │   ├── db.py
│   │   └── extensions.py
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_normalize.py
│   │   ├── test_personalization.py
│   │   ├── test_reports.py
│   │   └── test_scans.py
│   ├── .env.example
│   ├── requirements.txt
│   ├── startup.sh
│   └── wsgi.py
├── db/
│   ├── seed/
│   │   ├── ingredients_seed.csv
│   │   └── load_seed.py
│   ├── queries.sql
│   └── schema.sql
├── DOCS/
│   ├── analytics-report/
│   │   └── .gitkeep
│   ├── azure-screenshots/
│   │   └── .gitkeep
│   ├── wireframes/
│   │   └── .gitkeep
│   ├── ai-usage-declaration.md
│   ├── architecture.md
│   ├── data-classification.md
│   ├── prd.md (yours)
│   ├── security-checklist.md
│   ├── srd.md (yours)
│   ├── threat-model.md
│   └── trd.md (yours)
├── frontend/
│   ├── public/
│   │   ├── icons/
│   │   │   └── .gitkeep
│   │   └── manifest.webmanifest
│   ├── src/
│   │   ├── api/
│   │   │   ├── auth.js
│   │   │   ├── client.js
│   │   │   ├── profile.js
│   │   │   ├── reports.js
│   │   │   └── scans.js
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── ConsentNotice.jsx
│   │   │   │   ├── ErrorState.jsx
│   │   │   │   ├── GuestBanner.jsx
│   │   │   │   └── Spinner.jsx
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.jsx
│   │   │   │   └── BottomNav.jsx
│   │   │   ├── report/
│   │   │   │   ├── CategoryPieChart.jsx
│   │   │   │   ├── ConsumptionCard.jsx
│   │   │   │   ├── Disclaimer.jsx
│   │   │   │   ├── IngredientList.jsx
│   │   │   │   ├── RatingPieChart.jsx
│   │   │   │   └── VerdictCard.jsx
│   │   │   └── scan/
│   │   │       ├── CameraCapture.jsx
│   │   │       ├── ProgressStages.jsx
│   │   │       └── UploadButton.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useProfile.js
│   │   │   ├── useReports.js
│   │   │   └── useScan.js
│   │   ├── lib/
│   │   │   ├── constants.js
│   │   │   ├── imageCompress.js
│   │   │   └── ratingStyles.js
│   │   ├── mocks/
│   │   │   ├── data/
│   │   │   │   ├── guestSession.json
│   │   │   │   ├── otpRequest.json
│   │   │   │   ├── profile.json
│   │   │   │   ├── report.json
│   │   │   │   ├── reportsList.json
│   │   │   │   └── scanExtracted.json
│   │   │   └── index.js
│   │   ├── pages/
│   │   │   ├── History.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── NotFound.jsx
│   │   │   ├── Onboarding.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Report.jsx
│   │   │   ├── ReviewExtracted.jsx
│   │   │   └── Welcome.jsx
│   │   ├── routes/
│   │   │   ├── index.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── .gitignore
├── openapi.yaml
├── PROJECT_STRUCTURE.md
└── readme.md
```
Items marked (yours) or readme.md already exist in your project and are not created by the script.

## Source of truth
| What | Where |
| --- | --- |
| Database structure | db/schema.sql |
| Sample SQL | db/queries.sql |
| API contract | openapi.yaml |
| Requirements and design | DOCS/ (PRD, TRD, SRD) |
| Ingredient-name normalisation | backend/app/utils/normalize.py (one function, used everywhere) |

## Backend layers (keep them separate)
api (HTTP routes, validation) calls services (logic), which call repositories (SQL). Routes never contain SQL; repositories never contain business rules.

## Rules for any AI assistant working in this repo
1. Do not write feature code until the developer asks for that step. Stubs are comment-only on purpose.
2. Follow DOCS/trd and DOCS/srd. Do not change table or column names without updating db/schema.sql and the SRD.
3. Use parameterised SQL only (text() with bound parameters). Never build SQL with string formatting.
4. Never store label images. Process them in memory and discard.
5. Never commit secrets. Use environment variables and the .env.example files.
6. Guests have no database row: they are a short-lived token only.
7. Use fictional phone numbers, names and health profiles in tests and mock data.
8. Keep the frontend working against mock data (VITE_USE_MOCK=true) until the real endpoint exists.
9. Ask before adding a new dependency or folder.

## Setup (first run)
Backend:
```
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows. On Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env      # then fill in the values
```
Frontend:
```
cd frontend
npm install react react-dom react-router-dom @tanstack/react-query recharts
npm install -D vite @vitejs/plugin-react tailwindcss postcss autoprefixer
copy .env.example .env
npm run dev
```
Check on npm and PyPI that each package name is the one you intend before installing.

## Suggested build order
1. Run db/schema.sql on the dev Azure SQL database.
2. Backend skeleton: app factory, config, db helper, /health.
3. normalize.py and its tests.
4. Frontend shell with mock data: Welcome, Home, Report screens.
5. Guest start, then OTP login with the mock provider.
6. Scan and extraction with Gemini.
7. Ingredient lookup, personalisation, guidance, then saving reports.
8. History, profile, delete account.
9. Seed ingredients (first 100, then the rest).
10. Azure deployment, Key Vault, firewall, audit log, analytics views.
SCANWISE_EOF
fi
echo "Done. Skeleton created in $(pwd)"
