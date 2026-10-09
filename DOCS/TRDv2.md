# ScanWise — Technical Requirements Document (TRD) v2

Oct 9, 2026 · @Sahil Bhatia

ScanWise is built as a modular monolith: a React mobile-first web app, a Flask (Python) API, Azure SQL for relational data, Cosmos DB for raw AI output, and Gemini for label reading and unknown-ingredient analysis. This TRD turns the PRD into a buildable design; the SRD will hold the full database schema.

**Changes in v2 (9 Oct 2026):** the backend is now Flask (Python); guest mode is added; the admin role is removed for the MVP; the ingredient database is pre-filled with 200 to 250 ingredients; consumption limits come from a hand-seeded table; questions still to answer are tracked in section 13.

## 1. Technology stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React + Vite, Tailwind CSS, Recharts, installable PWA | Mobile-first, fast to build, Recharts gives the pie charts |
| Backend | Python 3 + Flask (blueprints), served by Gunicorn | Language you are comfortable with; REST JSON API |
| Backend libraries | Flask-JWT-Extended, Flask-Limiter, Flask-CORS, Flask-Talisman, Pydantic, Pillow, pytest | Tokens, rate limits, CORS, security headers, request validation, image checks, tests |
| Relational DB | Azure SQL Database through pyodbc (ODBC Driver 18), parameterised queries | Required: relational DB hosted on Azure; views, procedures, transactions |
| Non-relational store | Azure Cosmos DB, NoSQL API (azure-cosmos SDK) | Required DP-900 item; holds raw AI JSON (semi-structured) |
| AI | Gemini API through the google-genai Python SDK, multimodal Flash-class model | Reads the label image and returns structured JSON |
| Hosting | Azure App Service (Linux, Python) for the API; Azure Static Web Apps for the frontend | HTTPS by default |
| Secrets | Azure Key Vault through azure-identity, or App Service settings during development | Keeps keys out of the repository |
| Logging | Application Insights plus an `audit_log` table | Activity log for the security check |
| Analytics | Power BI report over an Azure SQL view | Required DP-900 analytics view |
| OTP and SMS | Provider not decided; hidden behind an `OtpProvider` interface | Mock provider for development, real one plugged in later |

Before relying on any free tier, check its current limits on the Azure portal and the Gemini pricing page, because these change.

You have an Azure student plan. Student subscriptions can restrict which regions and services are allowed, so choose the region from the list the portal offers (Central India if available) and confirm that Azure SQL, Cosmos DB and App Service can be created there before you build.

### 1.1 Why Flask instead of Node.js + Express

|  | Reasons it is good | Reasons it is not as good |
| --- | --- | --- |
| 1 | You know it well, so you build faster with fewer bugs in a 20-day window, and you can explain every line in the viva. | Flask is synchronous by default. A scan waits several seconds on Gemini and holds a worker, so you need Gunicorn threads or workers; Node handles waiting on network calls natively. |
| 2 | Python is strong for AI and text work: the Gemini SDK, Pillow for images, Pydantic for validation, and easy string matching for ingredient names. | Azure SQL from Python needs the ODBC driver installed on the host. This is a setup hurdle on App Service Linux (a startup script or a container); Node's SQL package needs no driver. |
| 3 | Flask is small and explicit, so blueprints map straight onto the modules in section 2 and it is easy to test with pytest and to explain at the design review. | The backend is a different language from the React frontend, so validation rules and types cannot be shared; the API contract in `openapi.yaml` must be kept in sync by hand. |

Mitigations: run Gunicorn with several worker threads, send all unknown ingredients to Gemini in one call, test the ODBC setup on Azure in the first days (not at the end), and treat `openapi.yaml` as the single source of truth for both sides.

## 2. Architecture

### 2.1 Components

| Component | Responsibility |
| --- | --- |
| React PWA | Welcome (log in or continue as guest), login, onboarding, camera capture or upload, extracted-text review, report, history, profile |
| API (Flask) | Auth, validation, rate limiting, orchestration of the scan pipeline, organised as blueprints |
| Extraction service | Sends the image to Gemini, validates the structured JSON, normalises ingredient names |
| Ingredient service | Database-first lookup; batches unknown ingredients to Gemini and saves the results |
| Personalization engine | Applies the profile to ingredient ratings, builds the verdict and consumption guidance (deterministic rules) |
| Report service | Saves the product, report and links in one transaction for logged-in users; reads history |
| Azure SQL | Users, profiles, ingredients, age-group limits, products, reports, audit log |
| Cosmos DB | Raw AI response per scan (30-day TTL) |
| Power BI | Analytics over a read-only SQL view |

These are modules inside one deployable backend, not separate services.

### 2.2 Data flow for one scan

1. The app compresses the photo on the device (longest side about 1600 px) and sends it to `POST /api/scans` with a user token or a guest token.
2. The API checks the token, role, rate limit (stricter for guests), file size and file type (by file signature, not just extension).
3. The image is held in memory, sent to Gemini, and discarded. It is never written to disk, SQL or Blob storage.
4. Gemini returns JSON: product name, category, ingredient list, nutrition values, allergen and warning text, and a confidence value. The API validates it against a fixed Pydantic schema.
5. The raw JSON is saved to Cosmos DB. The app shows the extracted ingredients so the user can correct them.
6. On `POST /api/scans/:id/analyze`, ingredient names are normalised and a product hash is computed (see 3.2).
7. If the product hash already exists, the saved product is reused. Otherwise each ingredient is looked up in Azure SQL.
8. All unknown ingredients are sent to Gemini in one batched call. The results are saved to the ingredient table with source `ai`.
9. The personalization engine applies the logged-in user's saved profile, or the guest's temporary choices sent with the request, and builds the report.
10. For a logged-in user, the product, ingredient links and the user's report are saved in one SQL transaction. For a guest, the report is only returned to the app and no user report or history row is created.

### 2.3 Design trade-off (required)

**Decision: database-first lookup with a product-level cache, instead of calling the AI for every scan.** AI calls are the slowest step (several seconds) and are limited by free-tier quotas. Saving each analysed ingredient and each product means repeat scans skip the AI entirely and cost nothing. The price is that stored AI answers can be wrong or go stale, so ingredient rows carry a `source` (`ai` or `manual`) and a `reviewed` flag. Without an admin role, the team corrects entries through the seed file or a SQL script, and manually curated rows always win over AI rows.

**Second decision: modular monolith instead of microservices.** Two developers and a short deadline make separate services a cost with no benefit. Module boundaries (extraction, ingredient, personalization, report) are kept clean so they could be split later.

### 2.4 Roles and guest mode

There are two roles for the MVP: **guest** and **user**. There is no admin role; this is deliberate scope control.

| Capability | Guest | User |
| --- | --- | --- |
| Scan a label and view the report | Yes, with a stricter limit (proposed 5 scans per day) | Yes, with a higher limit (proposed 30 scans per day) |
| Personalization | Age group and conditions chosen on screen, kept for the session only | Saved profile from onboarding |
| Consumption guidance | Yes | Yes |
| Report saved to history | No | Yes |
| Profile, history, delete account | No | Yes |

A guest starts with `POST /auth/guest`, which returns a short-lived guest token (about 1 hour) and stores no personal data. Guest scans still enrich the shared ingredient and product tables, because those hold no personal information. The app shows a prompt to log in to save reports and get personalised results.

## 3. Scan and analysis pipeline

### 3.1 Extraction

- Ask Gemini for JSON only, with a response schema; treat anything outside the schema as a failure.
- One automatic retry on a malformed response or timeout, then a clear error asking the user to retake the photo.
- Text read from the label is data, never instructions: it is passed to the model inside a fixed prompt, and the output is constrained by the schema, which limits prompt-injection through label text.
- A low confidence value, or no ingredients found, sends the user to the correction screen instead of continuing silently.

### 3.2 Normalisation and product hash

- Lowercase, trim, strip percentages and bracket notes, map common aliases (for example E-numbers to names).
- Product hash = SHA-256 of the sorted list of normalised ingredient names plus the category.
- Same hash means the same product formulation, so the saved analysis is reused and only personalization is recomputed.

### 3.3 Personalization rules

Personalization is deterministic code, not an AI call, so it is fast, testable and explainable.

- **Base rating** per ingredient: Safe, Adjustable, Risk (stored in the ingredient table).
- **Profile modifiers** (examples): high sugar with a diabetes profile raises the rating to Risk; a declared allergen match is always Risk; a skincare irritant with a sensitive skin type raises one level; some additives are Risk for child or teen groups.
- **Overall verdict** from the share and severity of ratings: Good for you, Okay in limits, Better avoided.
- **Age-group grouping:** each ingredient has a rating per age group (child, teen, adult, old age) in a lookup table, so the report can sort by group.
- **Consumption guidance:** computed from nutrition values and an `age_group_limit` table (for example daily sugar and sodium limits per group), giving servings per day and days. If the label has no nutrition data, the AI estimate is shown and clearly marked as an estimate.
- Every report carries a 'general information, not medical advice' disclaimer.

## 4. API list

All endpoints are under `/api`, JSON, and require HTTPS. Errors use one shape: `{ "error": { "code", "message" } }`.

| Method and path | Role | Purpose |
| --- | --- | --- |
| POST `/auth/guest` | public | Start a guest session and return a short-lived guest token |
| POST `/auth/otp/request` | public | Send an OTP to a mobile number (rate limited) |
| POST `/auth/otp/verify` | public | Verify OTP, return access token and set refresh cookie |
| POST `/auth/refresh` | user | Issue a new access token from the refresh cookie |
| POST `/auth/logout` | user | Revoke the refresh token |
| GET, PUT `/profile` | user | Read or update age group, conditions, allergies, skin type, preferences |
| POST `/scans` | guest, user | Upload a label image, return the extracted data |
| PATCH `/scans/:id` | guest, user | Save corrections to the extracted ingredients |
| POST `/scans/:id/analyze` | guest, user | Run analysis and return the report; a guest sends temporary profile choices in the body |
| GET `/reports` | user | List the user's reports (paged) |
| GET `/reports/:id` | user | One full report |
| DELETE `/reports/:id` | user | Delete a report |
| DELETE `/account` | user | Delete the account and all linked data |
| GET `/health` | public | Liveness check |

The API contract will be written as an `openapi.yaml` file in the repository on day one, so the backend and frontend can be built in parallel against the same contract (and the frontend can use mock responses until the backend is ready).

## 5. Security design

This maps to the Cloud Security checklist in the university guide.

| Requirement | Implementation |
| --- | --- |
| Login and role-based access | OTP login for users and short-lived tokens for guests; roles `guest` and `user` enforced by a decorator on every route; guests are blocked from profile, history and account routes |
| Hashed credentials | OTP and refresh tokens stored only as hashes; OTP expires in 5 minutes with at most 5 attempts |
| Sessions | Short-lived access token (about 15 minutes); refresh token in an httpOnly, secure cookie; revocable |
| HTTPS | HTTPS-only on App Service and Static Web Apps; HSTS header through Flask-Talisman |
| Secrets out of the repository | Keys and connection strings in Key Vault or App Service settings; `.env` is git-ignored; a secret scan runs before release |
| SQL injection | Parameterised queries only through pyodbc; stored procedure for the save transaction |
| Cross-site scripting | React escaping, no `dangerouslySetInnerHTML`, Content-Security-Policy header, Pydantic validation of every field |
| File upload safety | Size limit, file signature check, re-encode with Pillow before sending to AI, processed in memory only |
| Database network rule | Azure SQL firewall allows only the backend and the developers' IPs; public access otherwise denied |
| Rate limiting | Flask-Limiter on OTP, guest, scan and analyze endpoints, per IP and per token |
| Activity log | `audit_log` table (login, guest start, scan, delete) plus Application Insights |
| Privacy | Phone numbers masked in logs; encryption at rest (Azure default) and in transit; account deletion removes linked rows |
| Threat model | One-page STRIDE-style table (spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege) for the design review |

## 6. Data stores (overview)

| Data | Store | Class |
| --- | --- | --- |
| Users, profiles, ingredients, products, reports, audit log | Azure SQL (third normal form) | Structured |
| Raw AI response per scan, 30-day TTL | Cosmos DB, partition key `/userId` | Semi-structured |
| Label image | Not stored | Unstructured, transient |

The SRD defines the tables, keys, constraints, view, procedure, transaction and indexes.

**Seed data.** A seed script loads 200 to 250 common food and skincare ingredients from a CSV in `/db/seed`, each with a base rating, uses, disadvantages and a rating per age group, marked `manual` and reviewed by hand. The `age_group_limit` table is filled by hand from published guidance for the main nutrients (sugar, sodium, fat, caffeine); anything outside it falls back to an AI estimate that the app labels as an estimate.

## 7. Performance and caching

| Step | Target |
| --- | --- |
| Upload and validation | 1 s or less |
| Gemini extraction | 3 to 6 s |
| Ingredient lookup in SQL (indexed on normalised name) | 200 ms or less |
| One batched AI call for unknown ingredients | 3 to 8 s, only when needed |
| Personalization and report build | 100 ms or less |

A repeat product returns in about 5 s including extraction. A small in-memory cache holds the most-used ingredients. The app shows staged progress ('Reading label', 'Checking ingredients', 'Building report') so the wait feels shorter.

## 8. Frontend technical notes

- Screens: Welcome (log in or continue as guest), Login, Onboarding, Home and Scan, Review Extracted Text, Report, History, Profile.
- Camera through a file input with `capture="environment"`, plus a separate upload option; compress on the device before upload.
- Guests pick an age group and conditions on one quick screen; a banner offers login to save reports.
- Data fetching with TanStack Query; token kept in memory with silent refresh through the cookie.
- Report layout: verdict card, two pie charts (rating share, category share), ingredient list with icons and labels for safe, adjustable and risk (never colour alone), consumption card; ingredient details open on tap.
- Responsive from 360 px wide; Lighthouse mobile target of 85 or higher.

## 9. Repository, environments and delivery

- Monorepo: `/frontend`, `/backend` (Flask app with blueprints, services, tests and `requirements.txt`), `/db` (schema, queries, seed CSV and seed script), `/docs` (PRD, TRD, SRD, threat model), `openapi.yaml`.
- Environments: local (mock OTP, dev database) and Azure (production).
- GitHub Actions: lint and pytest on every push, deploy on merge to main.
- Commit from both members regularly: the guide marks pair members separately through commit history and viva.
- AI tools used in building the project must be declared in the report; both members must be able to explain every part.

## 10. Analytics (DP-900)

A SQL view `vw_scan_analytics` exposes scans per day, category split, rating distribution, most common risky ingredients and verdict counts, without personal fields. Power BI Desktop connects to the view and produces the analytics report. Check early whether publishing to the Power BI service works with your university account; if not, submit the report file and screenshots.

## 11. Testing

- Extraction accuracy on a set of at least 30 real labels (food and skincare, clear and imperfect photos).
- Unit tests for normalisation, hashing and personalization rules.
- API tests for auth, role checks and validation failures.
- A security checklist pass: injection attempts, oversized and fake image files, OTP brute force, expired tokens.

## 12. Work split and plan

| Dates | Backend | Frontend |
| --- | --- | --- |
| 9 to 18 Oct | SRD, ER diagram, schema script, seed list of 200 to 250 ingredients, threat model, `openapi.yaml` | UI wireframes, screen flow including the guest flow, design system, mock-API setup |
| 19 Oct | Design review: design document, ER diagram, threat model | Same |
| 20 to 28 Oct | Guest and user auth with mock OTP, scan, extraction, analyze, save; ODBC setup tested on Azure | Welcome, login, onboarding, scan and report screens on the real API |
| 28 Oct | Mid review: one feature end to end (scan to report) | Same |
| 29 Oct to 3 Nov | Azure deployment, Key Vault, firewall, audit log, view and Power BI | Polish, history, accessibility, performance |
| 3 and 6 Nov | Security check, final submission | Same |

Who takes which workstream is for you and your teammate to decide; the plan only shows the two streams.

## 13. Open items

**Questions to answer later (tracked)**

1. OTP provider: to be decided. A mock provider is used until then; the design does not depend on it.
2. Power BI: whether your student account can publish to the Power BI service. If not, submit the report file and screenshots.
3. How phone numbers are stored (kept as given, hashed, or encrypted): to be discussed. The SRD keeps a `phone_number` column for now; the final choice changes only that column and the OTP lookup.

**To confirm before development**

1. Exact Gemini model name and free-tier limits.
2. Azure region and service availability on the student subscription.
3. Real photos for the 30-label test set, collected early from products you can photograph yourselves.
