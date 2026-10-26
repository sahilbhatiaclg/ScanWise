# ScanWise — Codebase Audit & Azure SQL Setup Guide

---

## Part 1: Codebase Audit Results

### ✅ What's Ready (No Issues)

| File | Status | Notes |
|---|---|---|
| [schema.sql](file:///c:/Users/SAHIL/Desktop/ScanWise/db/schema.sql) | ✅ **Excellent** | 653 lines of production-grade T-SQL. 22 tables, indexes, trigger, stored procedure, analytics views, roles, and lookup seed data. Clean, well-commented, properly constrained. |
| [queries.sql](file:///c:/Users/SAHIL/Desktop/ScanWise/db/queries.sql) | ✅ **Excellent** | 16 query blocks covering every operation (matching, personalisation, reports, analytics, cleanup). All correctly reference the schema. |
| [ingredients_seed.csv](file:///c:/Users/SAHIL/Desktop/ScanWise/db/seed/ingredients_seed.csv) | ✅ **Populated** | 100 ingredients with categories, ratings, allergens, age exceptions, condition risks, and aliases. Format matches the `stg_ingredient_seed` staging table columns exactly. |
| [requirements.txt](file:///c:/Users/SAHIL/Desktop/ScanWise/backend/requirements.txt) | ✅ **Complete** | All dependencies pinned — Flask, pyodbc, google-genai, azure-cosmos, azure-identity, azure-monitor, Pillow, pydantic, pytest. `pyodbc==5.3.0` is correct. |
| Backend structure | ✅ **Correct** | Directory layout matches TRDv2 architecture: `api/`, `services/`, `repositories/`, `schemas/`, `security/`, `utils/`. |

### ⚠️ Issues Found & Fixed

| Issue | Severity | Action Taken |
|---|---|---|
| [.gitignore](file:///c:/Users/SAHIL/Desktop/ScanWise/.gitignore) was **empty** | 🔴 Critical | **Fixed** — Added rules for `.env`, `__pycache__/`, `venv/`, `node_modules/`, IDE files |
| [.env.example](file:///c:/Users/SAHIL/Desktop/ScanWise/backend/.env.example) was **empty** | 🟡 Medium | **Fixed** — Populated with all required env vars (Azure SQL, Flask, JWT, Gemini) |

### ⚠️ Issues Still Open (You'll Handle During Setup)

| Issue | Severity | When to Fix |
|---|---|---|
| [load_seed.py](file:///c:/Users/SAHIL/Desktop/ScanWise/db/seed/load_seed.py) is **empty** | 🟡 Medium | After database is live — Step 5 below |
| [db.py](file:///c:/Users/SAHIL/Desktop/ScanWise/backend/app/db.py) is **empty** | 🟡 Medium | After DB connection test passes — Step 7 below |
| [config.py](file:///c:/Users/SAHIL/Desktop/ScanWise/backend/app/config.py) is **empty** | 🟡 Medium | After DB connection test passes |
| All repo files are **empty** | 🟡 Expected | After `db.py` works |
| All API route files are **empty** | 🟡 Expected | After repos work |

### Schema-Specific Checks

| Check | Result |
|---|---|
| All 22 tables have PRIMARY KEYs | ✅ Pass |
| All FOREIGN KEY references are valid | ✅ Pass |
| CASCADE deletes on user → profile, conditions, allergens, reports, tokens | ✅ Pass |
| `audit_log.user_id` uses `ON DELETE SET NULL` (audit survives account deletion) | ✅ Pass |
| Stored proc `sp_save_report` validates JSON, uses transactions, XACT_ABORT | ✅ Pass |
| Stored proc uses `UPDLOCK + HOLDLOCK` for concurrent product insert safety | ✅ Pass |
| Trigger `trg_ingredients_audit` handles re-entrant firing (TRIGGER_NESTLEVEL) | ✅ Pass |
| Lookup seed data INSERTs match the table schemas | ✅ Pass |
| Analytics views use separate `analytics` schema | ✅ Pass |
| Roles `app_rw` and `analytics_reader` with proper DENY on audit_log | ✅ Pass |
| Ingredient seed CSV column order matches `stg_ingredient_seed` columns | ✅ Pass |
| `age_group_limits` table present but intentionally not seeded (needs published sources) | ✅ Correct |

> [!IMPORTANT]
> **Verdict: Your codebase is ready for Azure SQL setup.** The schema is solid, the CSV seed data is populated, and the only empty files are ones you're supposed to write *after* the database is live. No blockers.

---

## Part 2: Azure SQL Database Setup — Every Step

### Step 1: Prerequisites (One-Time Local Installs)

Open PowerShell **as Administrator** and run:

```powershell
# 1. Install ODBC Driver 18 for SQL Server
winget install Microsoft.msodbcsql18

# 2. Install Azure Data Studio (lightweight SQL client)
winget install Microsoft.AzureDataStudio

# 3. Install Python 3.12+ if not already installed
#    Check with:
python --version
#    If not installed:
winget install Python.Python.3.12
```

After installing ODBC Driver 18, **restart your terminal** and verify:

```powershell
Get-OdbcDriver | Where-Object { $_.Name -like "*SQL Server*" }
```

You should see a line like:
```
Name                           Platform
----                           --------
ODBC Driver 18 for SQL Server  64-bit
```

> [!TIP]
> If `winget` doesn't find `Microsoft.msodbcsql18`, download manually from:
> https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server
> Choose "Download ODBC Driver 18 for SQL Server (x64)".

---

### Step 2: Create Azure SQL Server (Azure Portal)

1. **Go to** [portal.azure.com](https://portal.azure.com) → Sign in with your student account
2. **Search** "SQL servers" in the top search bar → Click **"+ Create"**
3. **Fill in the details:**

   | Field | Value |
   |---|---|
   | Subscription | Your student subscription (e.g. "Azure for Students") |
   | Resource group | Click "Create new" → name it `scanwise-rg` |
   | Server name | `scanwise-server` (this becomes `scanwise-server.database.windows.net`) |
   | Location | **Central India** (or nearest region on your plan) |
   | Authentication method | **Use SQL authentication** |
   | Server admin login | `scanwise_admin` (note this down!) |
   | Password | A strong password (note this down!) |

4. Click **"Review + Create"** → **"Create"**
5. Wait ~2 minutes for deployment

> [!CAUTION]
> **Write down these 3 values immediately** — you'll need them for every connection:
> - Server: `scanwise-server.database.windows.net`
> - Username: `scanwise_admin`
> - Password: (whatever you set)

---

### Step 3: Create the Database

1. **Go to** your new SQL server in the portal
2. Click **"+ Create database"** (left sidebar or overview page)
3. **Fill in:**

   | Field | Value |
   |---|---|
   | Database name | `scanwise_dev` |
   | Want to use SQL elastic pool? | No |
   | Workload environment | **Development** |
   | Compute + storage | Click **"Configure database"** → Choose **Free** tier (32 GB, free for 12 months on student plan). If Free isn't available, pick **Basic** (5 DTU, ~₹340/month — cheapest option). |
   | Backup storage redundancy | Locally-redundant |

4. Click **"Review + Create"** → **"Create"**
5. Wait ~1 minute

---

### Step 4: Configure the Firewall

1. **Go to** your SQL server → Click **"Networking"** in the left sidebar
2. Under **"Firewall rules"**:
   - Click **"+ Add your client IPv4 address"** (this adds your current IP)
   - Toggle **"Allow Azure services and resources to access this server"** to **Yes**
3. Click **"Save"**

> [!NOTE]
> If your IP changes (e.g., you switch WiFi), you'll need to come back here and add the new IP. You'll get a "login failed" error — that's the firewall, not your credentials.

---

### Step 5: Connect with Azure Data Studio & Run the Schema

1. **Open Azure Data Studio**
2. Click **"New Connection"** (or `Ctrl + Shift + P` → "New Connection")
3. **Fill in:**

   | Field | Value |
   |---|---|
   | Connection type | Microsoft SQL Server |
   | Server | `scanwise-server.database.windows.net` |
   | Authentication type | SQL Login |
   | User name | `scanwise_admin` |
   | Password | Your password |
   | Database | `scanwise_dev` |
   | Encrypt | Mandatory |
   | Trust server certificate | False |

4. Click **"Connect"**

5. **Run the schema:**
   - Open [schema.sql](file:///c:/Users/SAHIL/Desktop/ScanWise/db/schema.sql) in Azure Data Studio (File → Open File)
   - Make sure you're connected to `scanwise_dev`
   - Click **"Run"** (or press `F5`)
   - All `GO` batch separators will work correctly in Azure Data Studio

6. **Verify — run these checks** (paste into a new query window):

```sql
-- 1. Check all tables were created (should be 23 rows)
SELECT TABLE_SCHEMA, TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_SCHEMA, TABLE_NAME;

-- 2. Check lookup data was seeded
SELECT 'roles' AS tbl, COUNT(*) AS rows FROM dbo.roles
UNION ALL SELECT 'age_groups', COUNT(*) FROM dbo.age_groups
UNION ALL SELECT 'ratings', COUNT(*) FROM dbo.ratings
UNION ALL SELECT 'product_types', COUNT(*) FROM dbo.product_types
UNION ALL SELECT 'ingredient_categories', COUNT(*) FROM dbo.ingredient_categories
UNION ALL SELECT 'nutrients', COUNT(*) FROM dbo.nutrients
UNION ALL SELECT 'health_conditions', COUNT(*) FROM dbo.health_conditions
UNION ALL SELECT 'allergens', COUNT(*) FROM dbo.allergens
UNION ALL SELECT 'skin_types', COUNT(*) FROM dbo.skin_types
UNION ALL SELECT 'dietary_preferences', COUNT(*) FROM dbo.dietary_preferences;

-- 3. Check stored procedure exists
SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_TYPE = 'PROCEDURE';

-- 4. Check trigger exists
SELECT name FROM sys.triggers WHERE parent_id = OBJECT_ID('dbo.ingredients');

-- 5. Check analytics views
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS 
WHERE TABLE_SCHEMA = 'analytics';
```

**Expected results:**

| Check | Expected |
|---|---|
| Tables | 23 rows (22 tables + `stg_ingredient_seed`) |
| `roles` | 1 row |
| `age_groups` | 4 rows |
| `ratings` | 3 rows |
| `product_types` | 4 rows |
| `ingredient_categories` | 19 rows |
| `nutrients` | 6 rows |
| `health_conditions` | 5 rows |
| `allergens` | 12 rows |
| `skin_types` | 5 rows |
| `dietary_preferences` | 5 rows |
| Stored procedure | `sp_save_report` |
| Trigger | `trg_ingredients_audit` |
| Analytics views | `vw_scan_analytics`, `vw_ingredient_risk_summary` |

---

### Step 6: Load the Ingredient Seed Data

Your [ingredients_seed.csv](file:///c:/Users/SAHIL/Desktop/ScanWise/db/seed/ingredients_seed.csv) has 100 ingredients ready. Load them into the staging table and then transform into the production tables.

**Option A: Bulk load via Azure Data Studio**

In Azure Data Studio, right-click `dbo.stg_ingredient_seed` → **"Import Wizard"** → select your CSV file → follow the wizard.

**Option B: Write the Python seed loader** ([load_seed.py](file:///c:/Users/SAHIL/Desktop/ScanWise/db/seed/load_seed.py))

I can write this script for you — just say the word after Step 7 passes.

**After loading into staging**, run the transform query to fan out into `ingredients`, `ingredient_aliases`, `ingredient_allergens`, `ingredient_age_ratings`, and `ingredient_condition_risks`. (This transform script is what `load_seed.py` should do.)

---

### Step 7: Set Up the Python Connection

```powershell
# Navigate to the backend directory and create a virtual environment
cd c:\Users\SAHIL\Desktop\ScanWise\backend
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

Then create your `.env` file:

```powershell
# Copy the template
Copy-Item .env.example .env
```

**Edit `backend\.env`** and fill in your real values:

```env
AZURE_SQL_SERVER=scanwise-server.database.windows.net
AZURE_SQL_DATABASE=scanwise_dev
AZURE_SQL_USER=scanwise_admin
AZURE_SQL_PASSWORD=YourActualPasswordHere
AZURE_SQL_DRIVER=ODBC Driver 18 for SQL Server
```

**Run the connection test** — create this file:

```powershell
# Quick one-liner test (run from backend/ with venv active)
python -c "
import pyodbc; from dotenv import load_dotenv; import os; load_dotenv()
conn_str = (
    f\"DRIVER={{{os.getenv('AZURE_SQL_DRIVER')}}};\"+
    f\"SERVER={os.getenv('AZURE_SQL_SERVER')};\"+
    f\"DATABASE={os.getenv('AZURE_SQL_DATABASE')};\"+
    f\"UID={os.getenv('AZURE_SQL_USER')};\"+
    f\"PWD={os.getenv('AZURE_SQL_PASSWORD')};\"+
    f\"Encrypt=yes;TrustServerCertificate=no;\")
with pyodbc.connect(conn_str) as conn:
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM dbo.ingredient_categories')
    print(f'Connected! Found {cursor.fetchone()[0]} ingredient categories.')
"
```

**Expected output:** `Connected! Found 19 ingredient categories.`

---

### Step 8: Test Data Verification (Run in Azure Data Studio)

Run the test data block from your [database_dev_plan.md](file:///c:/Users/SAHIL/Desktop/ScanWise/database_dev_plan.md) Step 4 — create a test user, profile, ingredient, and verify the trigger.

Then run the stored procedure test from Step 5 of the dev plan.

---

## Quick Reference: What You Need Installed

| Tool | Install Command | Purpose |
|---|---|---|
| ODBC Driver 18 | `winget install Microsoft.msodbcsql18` | Python ↔ Azure SQL connection driver |
| Azure Data Studio | `winget install Microsoft.AzureDataStudio` | GUI to run SQL, import CSVs |
| Python 3.12+ | `winget install Python.Python.3.12` | Backend runtime |
| pyodbc | `pip install pyodbc` (via requirements.txt) | Python SQL driver library |

## Quick Reference: Connection String

```
DRIVER={ODBC Driver 18 for SQL Server};
SERVER=scanwise-server.database.windows.net;
DATABASE=scanwise_dev;
UID=scanwise_admin;
PWD=<your-password>;
Encrypt=yes;
TrustServerCertificate=no;
```

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Login failed for user` | Wrong credentials | Double-check username/password in Azure Portal → SQL server → Overview |
| `Cannot open server requested by the login` | Wrong database name | Check you're connecting to `scanwise_dev`, not `master` |
| `Client with IP address X.X.X.X is not allowed` | Firewall | Azure Portal → SQL server → Networking → Add your IP |
| `[IM002] Data source name not found` | ODBC Driver not installed | Run `winget install Microsoft.msodbcsql18` and restart terminal |
| `TCP Provider: No connection could be made` | Firewall or VPN blocking port 1433 | Disable VPN, or open port 1433 in Windows Firewall |
| `pyodbc.InterfaceError: connection string` | Driver name mismatch | Run `Get-OdbcDriver` and use the exact name shown |
