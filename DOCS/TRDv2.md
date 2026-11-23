# ScanWise — Technical Requirements Document (TRD)

Version 3.0 · Embedded SQL & Zero External Portal Architecture · Status: Implemented

## 1. Technology Stack

| Layer | Choice | Rationale |
| --- | --- | --- |
| **Frontend** | React + Vite, Tailwind CSS, Recharts | Mobile-first, responsive, zero-latency rendering with client routing |
| **Backend** | Python 3 + Flask (Modular Blueprints) | Standard, robust, easy to test, fast native JSON REST API |
| **Database** | Embedded SQL (`sqlite3`) | Standard SQL inside the codebase; zero external cloud portal configuration; effortlessly deploys to Vercel and local dev |
| **AI Engine** | Google Gemini API (`google-genai` SDK) | Vision model (`gemini-2.0-flash`) for multimodal extraction and unknown ingredient classification |
| **Auth** | Flask-JWT-Extended + Hashed OTP | Stateless JWT access/refresh tokens with role separation (`guest` and `user`) |
| **Image Pipeline** | Pillow (`PIL`) | In-memory verification, sanitization, and resize to 1600px max dimension; image discarded immediately |
| **Testing** | Pytest | Complete automated test suite covering database seeding, queries, personalization, and endpoints |

---

## 2. Architecture & Data Flow

```
[User Camera / File Upload]
           │
           ▼
[Flask Backend (/api/scans)] ──(Validate & Re-encode in memory)
           │
           ▼
[Gemini Vision API (gemini-2.0-flash)]
           │
   Structured JSON (Ingredients, Nutrition, Category)
           │
           ▼
[SQLite Knowledge Base (100 Seed Ingredients)]
   ├── Matched Known Ingredients ──> (Retrieved from SQL)
   └── Unknown Ingredients ──> [Gemini API Batch Classification] ──> (Saved to SQL)
           │
           ▼
[Personalization Engine (SQL Rules)]
   ├── Age-group overrides
   ├── Health condition risks (e.g. Sugar -> Diabetes: Risk)
   └── Allergen matches (e.g. Soy Lecithin -> Soy: Risk)
           │
           ▼
[One-Transaction Report Generation]
   └── Saved to `products`, `reports`, `report_items`
           │
           ▼
[React Mobile-First UI (Visual Charts & Verdicts)]
```

---

## 3. Database Schema Overview

The embedded SQL schema in `db/schema.sql` creates and manages:
1. **10 Lookup & Category Tables**: Pre-seeded with medical categories, age groups, nutrients, and severity ranks.
2. **100 Curated Seed Ingredients**: Imported directly from `db/seed/ingredients_seed.csv` upon first boot with:
   - Full chemical and trade aliases (e.g., E211 for Sodium Benzoate)
   - Verified allergen relationships
   - Age exceptions (e.g., Caffeine for child/teen)
   - Condition risk modifiers (e.g., Sodium for Hypertension)
3. **Transaction-Safe Reports**: Generates deterministic product hashes (`SHA-256`) to reuse analyses and prevent redundant processing.
4. **Operations & Audit Log**: Logs user actions, scan durations, and authentication attempts.

---

## 4. API Endpoints

- **Auth**:
  - `POST /api/auth/guest` — Generates a guest session token
  - `POST /api/auth/otp/request` — Generates/dispatches OTP
  - `POST /api/auth/otp/verify` — Validates OTP and returns JWT tokens
  - `POST /api/auth/refresh` — Refreshes access token
  - `DELETE /api/auth/account` — Cascade deletes user data
- **Profile**:
  - `GET /api/profile` — Retrieves user health questionnaire
  - `PUT /api/profile` — Updates health conditions, age group, allergens
- **Scanning & Analysis**:
  - `POST /api/scans` — Receives image, calls Gemini Vision, returns extracted ingredients
  - `PATCH /api/scans/:id` — Allows user correction of ingredient text
  - `POST /api/scans/:id/analyze` — Resolves ingredients against SQLite, personalizes, and builds visual report
- **Reports**:
  - `GET /api/reports` — Paged user scan history
  - `GET /api/reports/:id` — Full report detail by public GUID
  - `DELETE /api/reports/:id` — Deletes report snapshot
- **Health**:
  - `GET /api/health` — Verifies database connection and loaded ingredient count (100)

---

## 5. Vercel & Production Deployment

Because SQLite runs as a local file inside the application runtime:
- No external database provisioner, virtual network, or firewall setup is necessary.
- For Vercel, the application is packaged via `wsgi.py` / serverless API function.
- All 100 ingredients and schema tables are bundled within the repository and automatically initialized.
- Simply supply `GEMINI_API_KEY` in Vercel Environment Variables.
