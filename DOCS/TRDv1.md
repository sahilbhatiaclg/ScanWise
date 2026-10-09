# ScanWise — Technical Requirements Document (TRD)

Oct 9, 2026 · @Sahil Bhatia

ScanWise is built as a modular monolith: a React mobile-first web app, a Node.js + Express API, Azure SQL for relational data, Cosmos DB for raw AI output, and Gemini for label reading and unknown-ingredient analysis. This TRD turns the PRD into a buildable design; the SRD will hold the full database schema.

## 1. Technology stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React + Vite, Tailwind CSS, Recharts, installable PWA | Mobile-first, fast to build, Recharts gives the pie charts |
| Backend | Node.js + Express (REST, JSON) | One language across the stack; quick for a 2-person team |
| Relational DB | Azure SQL Database (free offer) | Required: relational DB hosted on Azure; supports views, procedures, transactions |
| Non-relational store | Azure Cosmos DB (free tier), NoSQL API | Required DP-900 item; holds raw AI JSON (semi-structured) |
| AI | Gemini API, multimodal Flash-class model | Reads the label image and returns structured JSON; you already hold keys |
| Hosting | Azure App Service (backend), Azure Static Web Apps (frontend) | Free tiers, HTTPS by default |
| Secrets | Azure Key Vault, or App Service settings during development | Keeps keys out of the repository |
| Logging | Application Insights + an `audit_log` table | Activity log for the security check |
| Analytics | Power BI report over an Azure SQL view | Required DP-900 analytics view |
| OTP/SMS | Provider not decided; hidden behind an `OtpProvider` interface | Mock provider for development, real one plugged in later |

Before relying on any free tier, check its current limits on the Azure portal and the Gemini pricing page, because these change.

## 2. Architecture

### 2.1 Components

| Component | Responsibility |
| --- | --- |
| React PWA | Login, onboarding, camera capture or upload, extracted-text review, report, history, admin screens |
| API (Express) | Auth, validation, rate limiting, orchestration of the scan pipeline |
| Extraction service | Sends the image to Gemini, validates the structured JSON, normalises ingredient names |
| Ingredient service | Database-first lookup; batches unknown ingredients to Gemini and saves the results |
| Personalization engine | Applies the user's profile to ingredient ratings, builds the verdict and consumption guidance (deterministic rules) |
| Report service | Saves the product, report and links in one transaction; reads history |
| Azure SQL | Users, profiles, ingredients, products, reports, audit log |
| Cosmos DB | Raw AI response per scan (30-day TTL) |
| Power BI | Analytics over a read-only SQL view |

These are modules inside one deployable backend, not separate services.

### 2.2 Data flow for one scan

1. The app compresses the photo on the device (longest side about 1600 px) and sends it to `POST /api/scans` with the access token.
2. The API checks the token, role, rate limit, file size and file type (by file signature, not just extension).
3. The image is held in memory, sent to Gemini, and discarded. It is never written to disk, SQL or Blob storage.
4. Gemini returns JSON: product name, category, ingredient list, nutrition values, allergen and warning text, and a confidence value. The API validates it against a fixed schema.
5. The raw JSON is saved to Cosmos DB. The app shows the extracted ingredients so the user can correct them.
6. On `POST /api/scans/:id/analyze`, ingredient names are normalised and a product hash is computed (see 3.2).
7. If the product hash already exists, the saved product is reused. Otherwise each ingredient is looked up in Azure SQL.
8. All unknown ingredients are sent to Gemini in one batched call. The results are saved to the ingredient table with source `ai`.
9. The personalization engine applies the user's profile and returns the report.
10. Product, ingredient links and the user's report are saved in one SQL transaction, then returned to the app.

### 2.3 Design trade-off (required)

**Decision: database-first lookup with a product-level cache, instead of calling the AI for every scan.** AI calls are the slowest step (several seconds) and are limited by free-tier quotas. Saving each analysed ingredient and each product means repeat scans skip the AI entirely and cost nothing. The price is that stored AI answers can be wrong or go stale, so ingredient rows carry a `source` (`ai` or `admin`) and a `reviewed` flag, and admins can correct them; corrected rows always win.

**Second decision: modular monolith instead of microservices.** Two developers and a short deadline make separate services a cost with no benefit. Module boundaries (extraction, ingredient, personalization, report) are kept clean so they could be split later.

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
| POST `/auth/otp/request` | public | Send an OTP to a mobile number (rate limited) |
| POST `/auth/otp/verify` | public | Verify OTP, return access token and set refresh cookie |
| POST `/auth/refresh` | public | Issue a new access token from the refresh cookie |
| POST `/auth/logout` | user | Revoke the refresh token |
| GET, PUT `/profile` | user | Read or update age group, conditions, allergies, skin type, preferences |
| POST `/scans` | user | Upload a label image, return the extracted data |
| PATCH `/scans/:id` | user | Save the user's corrections to the extracted ingredients |
| POST `/scans/:id/analyze` | user | Run analysis and return the report |
| GET `/reports` | user | List the user's reports (paged) |
| GET `/reports/:id` | user | One full report |
| DELETE `/reports/:id` | user | Delete a report |
| DELETE `/account` | user | Delete the account and all linked data |
| GET, PUT `/admin/ingredients` | admin | Search and correct ingredient entries |
| GET `/admin/analytics` | admin | Usage summary |
| GET `/health` | public | Liveness check |

The API contract will be written as an `openapi.yaml` file in the repository on day one, so the backend and frontend can be built in parallel against the same contract (and the frontend can use mock responses until the backend is ready).

## 5. Security design

This maps to the Cloud Security checklist in the university guide.

| Requirement | Implementation |
| --- | --- |
| Login and role-based access | OTP login; roles `user` and `admin`; role check middleware on every route |
| Hashed credentials | OTP and refresh tokens stored only as hashes; OTP expires in 5 minutes with at most 5 attempts |
| Sessions | Short-lived access token (about 15 minutes); refresh token in an httpOnly, secure cookie; revocable |
| HTTPS | HTTPS-only on App Service and Static Web Apps; HSTS header |
| Secrets out of the repository | Keys and connection strings in Key Vault or App Service settings; `.env` is git-ignored; a secret scan runs before release |
| SQL injection | Parameterised queries only; stored procedure for the save transaction |
| Cross-site scripting | React escaping, no `dangerouslySetInnerHTML`, Content-Security-Policy header, server-side validation of every field |
| File upload safety | Size limit, file signature check, re-encode before sending to AI, processed in memory only |
| Database network rule | Azure SQL firewall allows only the backend and the developers' IPs; public access otherwise denied |
| Rate limiting | Per-IP and per-user limits on OTP, scan and analyze endpoints |
| Activity log | `audit_log` table (login, scan, delete, admin edits) plus Application Insights |
| Privacy | Phone numbers masked in logs; encryption at rest (Azure default) and in transit; account deletion removes linked rows |
| Threat model | One-page STRIDE-style table (spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege) for the design review |

## 6. Data stores (overview)

| Data | Store | Class |
| --- | --- | --- |
| Users, profiles, ingredients, products, reports, audit log | Azure SQL (third normal form) | Structured |
| Raw AI response per scan, 30-day TTL | Cosmos DB, partition key `/userId` | Semi-structured |
| Label image | Not stored | Unstructured, transient |

The SRD defines the tables, keys, constraints, view, procedure, transaction and indexes.

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

- Screens: Login, Onboarding, Home and Scan, Review Extracted Text, Report, History, Profile, Admin.
- Camera through a file input with `capture="environment"`, plus a separate upload option; compress on the device before upload.
- Data fetching with TanStack Query; token kept in memory with silent refresh through the cookie.
- Report layout: verdict card, two pie charts (rating share, category share), ingredient list with icons and labels for safe, adjustable and risk (never colour alone), consumption card; ingredient details open on tap.
- Responsive from 360 px wide; Lighthouse mobile target of 85 or higher.

## 9. Repository, environments and delivery

- Monorepo: `/frontend`, `/backend`, `/db` (schema and queries), `/docs` (PRD, TRD, SRD, threat model), `openapi.yaml`.
- Environments: local (mock OTP, dev database) and Azure (production).
- GitHub Actions: lint and tests on every push, deploy on merge to main.
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
| 9 to 18 Oct | SRD, ER diagram, schema script, threat model, `openapi.yaml` | UI wireframes and screen flow, design system, mock-API setup |
| 19 Oct | Design review: design document, ER diagram, threat model | Same |
| 20 to 28 Oct | Auth with mock OTP, scan, extraction, analyze, save | Login, onboarding, scan, report screens on the real API |
| 28 Oct | Mid review: one feature end to end (scan to report) | Same |
| 29 Oct to 3 Nov | Azure deployment, Key Vault, firewall, audit log, view and Power BI | Polish, history, admin, accessibility, performance |
| 3 and 6 Nov | Security check, final submission | Same |

## 13. Open items

1. OTP provider: to be decided; the design does not depend on it.
2. Exact Gemini model name and free-tier limits: confirm before development starts.
3. Power BI publishing access through your university account.
4. Real photos for the 30-label test set: collect early, using products you can photograph yourselves.
