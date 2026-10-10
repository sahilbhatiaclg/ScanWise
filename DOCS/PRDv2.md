# ScanWise — Product Requirements Document (PRD)

Version 2.0 · 9 October 2026 · Team: Sahil + 1 teammate · Status: Draft for design review (19 Oct 2026)

## 1. Overview

**ScanWise** is a mobile-first web app that reads the *back label* of a packaged product (ingredient list, back paragraphs, nutrition and other back-label text), uses AI to extract and analyse it, and returns a simple visual report: pie charts, a safe / adjustable / risk rating for each ingredient, and guidance on how much of the product different age groups can consume over a period of days.

It works for eatables and for non-food products such as skincare.

**One-line description:** Scan a product's back label and instantly see which ingredients are safe, adjustable or risky for you, with simple charts.

### 1.1 Problem

Ingredient lists are long, full of technical names, and printed in tiny text. Most people cannot tell whether a product suits their age or health condition. Older users checking eatables against conditions such as diabetes or blood pressure, and Gen Z users choosing food and skincare, need a quick and simple answer, not a heavy technical report.

### 1.2 Solution

The user logs in with a mobile OTP and answers a few basic health questions once. They scan or upload a label. The backend extracts the ingredients, checks them against a growing ingredient database, uses AI only for ingredients not yet known, saves the result, and shows a clean, personalised report.

## 2. Goals, non-goals and success metrics

### 2.1 Goals

1. Deliver a working MVP with the 5 core features by the internal target date (see section 11).
2. Give a report that a non-technical user understands in under 10 seconds of looking at it.
3. Build the ingredient database so repeat scans are faster and cheaper (AI is called only for unknown ingredients).
4. Show the four required academic subjects (System Design, RDBMS, DP-900, Cloud Security) in the running application.

### 2.2 Non-goals (v1)

- Medical diagnosis or clinical dietary advice
- Barcode or front-of-pack scanning (only back labels)
- Social features, shopping links, price comparison
- Multiple languages and offline mode
- Native mobile apps (this is a responsive web app), and an admin role or admin screens

### 2.3 Success metrics

These map to the success criteria you gave: scan accuracy, report speed, and UI/UX quality.

| Area | Metric | Target |
| --- | --- | --- |
| Accuracy | Ingredients correctly extracted from a test set of at least 30 real labels | 90% or higher recall |
| Accuracy | Ingredients where the user had to correct the extracted text | Under 15% |
| Speed | Report time for an already-known product | 5 seconds or less (90th percentile) |
| Speed | Report time for a new product with new ingredients | 20 seconds or less (90th percentile) |
| UI/UX | Mobile Lighthouse performance and accessibility scores | 85 or higher |
| UI/UX | Taps from login to first report for a returning user | 3 or fewer |
| Reliability | Successful scans out of all scan attempts during testing | 95% or higher |

## 3. Users

| Persona | Who | Main need | Typical products |
| --- | --- | --- | --- |
| Senior user | Older adult, often with a health condition (for example diabetes, blood pressure) | Know if an eatable is okay for their condition and how much is safe | Packaged snacks, biscuits, drinks, supplements |
| Gen Z user | Teen to mid-20s, health and ingredient conscious | Quickly compare food and skincare | Snacks, energy drinks, moisturisers, cleansers |
| Guest | Visitor without an account | Try a scan quickly with no sign-up, then log in to save reports | Any packaged food or skincare product |

The app has two roles: **Guest** and **User**. There is no admin role in the MVP. This also supports the role-based access requirement of the Cloud Security subject.

## 4. User journey

1. **Log in** with a mobile number and OTP, or continue as a guest with limited scans and no saved history.
2. **First-time setup:** answer a few basic health questions (age group, allergies, health conditions, skin type, dietary preference). These can be edited later. Guests only pick an age group and conditions for that session.
3. **Scan:** take a photo with the camera or upload an image of the back label.
4. **Review (optional):** see the extracted ingredient text and correct it if needed.
5. **Analyse (backend):**
   - Extract the ingredients and label details using the AI vision API.
   - Look up each ingredient in the database.
   - Ingredients that are known are reused. New ingredients are analysed by AI for uses and disadvantages, then saved.
   - The product and its report are saved for future use.
6. **View the report:** simple visuals, not heavy text.
7. **History:** the user can open past reports (product name, description, report, date and time).

## 5. Core features (the 5 must-haves)

The university guide requires at least 5 core features for a pair. These are the five.

### F1. Product Label Scanning

Capture or upload an image of the back label.

- Camera capture in the mobile browser, plus file upload as fallback.
- Accepts JPG, PNG and WebP up to a set size limit (proposed: 5 MB).
- Basic quality check before sending (blurry or too dark, with a retake prompt).
- The image is processed and **not stored**.

**Acceptance:** a user can go from the scan screen to a submitted label in 2 taps; unsupported or oversized files are rejected with a clear message.

### F2. Ingredient and Information Extraction

The AI API reads the label and returns structured data.

- Extracted fields: product name (if visible), category (food or skincare or other), ingredient list, and other back-label details (nutrition values, warnings, allergen statements, usage directions where present).
- Ingredient names are normalised (case, spelling, common aliases) before database lookup.
- A confidence indicator is shown, and the user can edit the extracted text before analysis.
- Output is validated against a fixed schema; a malformed AI response triggers one retry, then an error message.

**Acceptance:** for a clear label, at least 90% of ingredients are extracted correctly; the extracted result is always shown in a consistent structure.

### F3. Ingredient Analysis

Every ingredient gets its uses and disadvantages, and a rating.

- **Database first:** known ingredients are read from the database.
- **AI for unknowns:** new ingredients are analysed by AI (plain-language use, possible disadvantages, risk tags such as allergen, sugar-related, irritant) and saved so the next scan is faster.
- The team corrects wrong entries through the seed file or a SQL script (no admin screen in the MVP). The database is pre-filled with 200 to 250 common, hand-reviewed ingredients so the first scans are fast.
- Each ingredient has a base rating of **Safe**, **Adjustable** (fine in limited amounts or for some groups) or **Risk**.

**Acceptance:** a repeat scan of the same ingredients makes no new AI call for those ingredients; every ingredient in a report shows a rating and a short explanation on tap.

### F4. Personalized Product Insights

The report is tailored to the user's profile.

- The base rating is adjusted using the user's age group, allergies, conditions, skin type and dietary preference.
- Ingredients are **sorted by age group suitability**, with a safe sign, adjustable sign or risk sign.
- **Consumption guidance:** an estimate of how much of the product an age group can consume across a number of days (for example, servings per day and for how many days), calculated from a hand-seeded table of daily limits per age group for main nutrients such as sugar, sodium, fat and caffeine. Where the label has no data, an AI estimate is shown and labelled as an estimate.
- A short overall verdict: Good for you, Okay in limits, or Better avoided, with a one-line reason.
- A visible disclaimer that this is general information, not medical advice.

**Acceptance:** two users with different profiles scanning the same product see different verdicts or ratings where their profiles make a difference; the disclaimer is always visible on the report.

### F5. Visual Product Report

The main output screen, designed to be clean and not overloaded.

- **Pie charts:** share of ingredients by rating (safe / adjustable / risk), and where relevant by category (for example sweeteners, preservatives, additives).
- Overall verdict card at the top.
- Ingredient list with safe, adjustable and risk signs, grouped by age group.
- Consumption guidance card.
- Details such as uses and disadvantages are hidden until the user taps an ingredient (no clutter).
- The report is saved with product name, description, and date and time.

**Acceptance:** the report fits a mobile screen with minimal scrolling for the summary view; charts render correctly on common phone sizes.

## 6. Supporting functional requirements

| ID | Requirement |
| --- | --- |
| S1 | Mobile OTP login; OTP expires after a short time and is limited in attempts; OTP stored hashed. |
| S2 | Role-based access: Guest and User. |
| S3 | Onboarding health questionnaire, editable from a profile screen. |
| S4 | History: list of past reports with product name, description, date and time; open or delete a report. |
| S5 | Product reuse: if the same product (identified by its normalised ingredient list) was analysed before, the saved report is reused and re-personalised, with no new AI call. |
| S6 | Account and data deletion by the user. |
| S7 | Guest mode: scan and view a report without logging in, with a stricter scan limit and no saved history. |
| S8 | Clear error and empty states (bad image, AI failure, no ingredients found, no network). |

## 7. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Performance | See success metrics in section 2.3. Show a progress state during analysis. |
| Responsiveness | Mobile first; works on common phone widths and scales up to desktop. |
| Security | HTTPS everywhere; secrets (API keys, connection strings) kept out of the repository; input validation against SQL injection and cross-site scripting; firewall or network rule on the database; activity log; rate limiting on OTP and scan endpoints. |
| Privacy | Label images are not stored; only the report is saved. Minimal personal data collected. |
| Availability | Hosted on the cloud with a public URL for the final submission. |
| Cost | Free tiers or university credit only, with usage limits on AI calls. |
| Accessibility | Readable text size and contrast; safe / adjustable / risk must not rely on colour alone (also shown with icons and labels). |
| Maintainability | Clear module separation, and an API reference that the frontend and backend developers share. |

## 8. Data, privacy and compliance

### 8.1 Data the app handles

| Data | Type | Stored? |
| --- | --- | --- |
| User account (mobile number, role) | Structured | Yes |
| Health profile (age group, allergies, conditions, skin type, preferences) | Structured | Yes, treated as sensitive |
| Ingredients (name, uses, disadvantages, rating, source) | Structured | Yes |
| Products and reports (name, description, scores, date and time) | Structured | Yes |
| Raw AI response for a scan | Semi-structured (JSON) | Yes, in a non-relational store |
| Label image | Unstructured | **No**, processed in memory and discarded |

### 8.2 Compliance and privacy requirements

You asked me to add compliance based on the project idea. Because the app collects a phone number and health information, these are the proposed requirements:

- Consent screen at signup and a plain-language privacy notice explaining what is collected and why.
- Health answers are optional where possible and are never shared or sold.
- Users can view, edit and delete their profile and history (S4, S6).
- Data minimisation: only needed fields are stored; no images retained.
- Health data is encrypted at rest and in transit (cloud database encryption plus HTTPS).
- The report always carries a "not medical advice" disclaimer, and AI output is labelled as AI-generated.
- Alignment target: India's Digital Personal Data Protection Act, 2023 principles (consent, purpose limitation, deletion). For a semester project this means following the principles, not formal certification.

### 8.3 University data rule

The guide says to use only dummy or public data and no real personal data in the application. So for demos and testing, use test phone numbers and fictional health profiles only. Add this to the README.

## 9. Mapping to the university requirements

The project is marked out of 100: 20 each for System Design, RDBMS, DP-900 and Cloud Security, 10 for integration, and 10 for report, demo and viva. A missing subject scores zero for that subject and for integration, so each must be visible in the running app.

| Subject | How ScanWise shows it | Deliverable |
| --- | --- | --- |
| System Design | Functional and non-functional requirements (this PRD); architecture with scan, extraction, analysis and report components; API list; one written trade-off (for example caching known products and ingredients to cut AI latency and cost). | Design document (TRD) with architecture diagram |
| RDBMS | Third normal form schema with at least 5 related tables (users, health profiles, products, ingredients, product-ingredient links, reports); constraints; joins; one view; one stored procedure or trigger; one transaction (saving a product with its ingredients and report); indexes on searched columns (ingredient name, product hash). | ER diagram, schema script, query file (SRD) |
| DP-900 | Data classified as structured, semi-structured and unstructured (section 8.1); relational database hosted on Azure; one non-relational store on Azure (for example Cosmos DB for raw AI JSON); one analytics view such as a Power BI report on scans, popular ingredients and rating distribution. | Classification note, Azure screenshots, analytics report |
| Cloud Security | OTP login with role-based access; hashed secrets and OTPs; HTTPS; secrets out of the repository; input validation; database firewall rule; activity log. | Threat model and security checklist |
| Integration | Frontend, backend, Azure SQL, non-relational store, AI API and Power BI working together in one app. | Live URL |

## 10. Constraints and assumptions

- **Stack of AI:** Gemini API for vision and extraction and for new-ingredient analysis (you already have keys).
- **Cloud:** Azure student plan, using your endpoints and keys; free-tier, region and service limits are to be confirmed.
- **Team:** two people, with the backend and frontend built in parallel against a shared API contract.
- **OTP provider:** not decided yet. The PRD only requires "mobile OTP". The provider will be fixed in the TRD once you decide (options include Azure Communication Services, Firebase Auth or a Twilio trial). For development, a mock OTP mode can be used.
- **Free-tier limits:** AI calls and SMS are limited, so database-first lookup and product reuse are important, not optional.
- **Accuracy depends on the photo:** blurry, curved or glossy labels will reduce extraction quality.

## 11. Milestones and timeline

You mentioned a 20-day deadline. The university guide has fixed dates, so here they are side by side. 20 days from 9 October is 29 October, which sits between the mid review (28 October) and the security check (3 November).

| Date | Milestone | What is needed |
| --- | --- | --- |
| 9–18 Oct | Documentation | PRD, TRD, SRD, ER diagram, threat model |
| 19 Oct | **Design review** | Design document, ER diagram, threat model. Building officially starts only after this passes. |
| 20–28 Oct | Build core flow | Login, scan, extraction and one core feature working end to end |
| 28 Oct | **Mid review** | Repository link and one core feature end to end |
| 29 Oct | Internal target | All 5 features working (your 20-day target) |
| 29 Oct–3 Nov | Harden and deploy | Cloud deployment, security checklist, analytics report |
| 3 Nov | **Security check** | Live cloud URL, security checklist, analytics report |
| 6 Nov | **Final submission** | Live URL, repository with README, report, schema script and query file, analytics report |

Because the design review is on 19 October, the PRD, TRD and SRD need to be done in about 10 days, not after.

## 12. Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Poor extraction from a bad photo | Wrong report | Quality check before sending, editable extracted text, confidence indicator |
| AI gives wrong or unsafe health information | User harm, marks lost | Database-first, hand-reviewed seed ingredients, disclaimer, conservative "Adjustable" or "Risk" default for uncertain ingredients, no medical claims |
| AI or SMS free-tier limits reached | Demo failure | Cache products and ingredients, rate limit, mock OTP for development, pre-seed the ingredient database |
| Slow AI response | Poor UX | Progress state, parallel ingredient lookups, reuse saved reports |
| Tight timeline for two people | Missed milestone | Fix API contract early, split backend and frontend, cut scope to the 5 features only |
| Real personal data used in demo | Breaks the university rule | Test numbers and fictional profiles only |

## 13. Open questions

**Still open**

1. Which OTP provider will be used? To be decided later; the TRD keeps the provider behind a swappable interface so this does not block the design.
2. Can your student account publish a Power BI report to the Power BI service? To be answered later; if not, the report file and screenshots are submitted.
3. How should phone numbers be stored (as given, hashed or encrypted)? To be discussed later; only the user table and OTP lookup depend on it.

**Decided (9 Oct 2026)**

1. Non-relational store: Cosmos DB holds the raw AI JSON for each scan.
2. Questionnaire for v1: age group (child, teen, adult, old age) plus basic health conditions such as sugar or diabetes.
3. Product categories for v1: packaged food and drinks, and skincare.
4. Registration: the project idea is already registered on the public list.
5. Roles: Guest and User only; there is no admin role in the MVP, and guest mode is included.
6. The ingredient database is pre-filled with 200 to 250 common ingredients.
7. Consumption limits come from a hand-seeded table per age group, with a labelled AI estimate as fallback.
8. Cloud: Azure student plan.

## 14. Next documents

- **TRD (Technical Requirements Document):** architecture, tech stack, API list, AI pipeline, Azure services, security design.
- **SRD (System/Schema Requirements Document):** ER diagram, tables, constraints, views, procedures, indexes, sample queries.
