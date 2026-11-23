# ScanWise — HOW TO START

### 1. Prerequisites & Environment Setup
Add your Google Gemini API key in `backend/.env`:
```env
GEMINI_API_KEY=AIzaSy...
```

---

### 2. How to Start the Project Locally

#### Option A: One-Click Startup (Recommended)
Double-click `start_local.bat` or run in terminal:
```powershell
.\start_local.bat
```
*This automatically launches both backend and frontend in separate windows and opens your browser.*

#### Option B: Manual Startup

**Terminal 1 — Backend (Flask + SQLite):**
```powershell
python backend/wsgi.py
```
- URL: `http://127.0.0.1:5000`
- Health check: `http://127.0.0.1:5000/api/health`
- Database: Built-in SQLite (`backend/instance/scanwise.db`, 100 ingredients pre-loaded).

**Terminal 2 — Frontend (React + Vite):**
```powershell
cd frontend
npm run dev
```
- Web App: `http://localhost:5173`

---

### 3. Verification & Diagnostics

Run anytime from the project root:

```powershell
# 1. Test database, schema, and 100 seed ingredients
python backend/tests/run_db_tests.py

# 2. Test API auth, OTP, and profile endpoints
python backend/tests/run_api_tests.py

# 3. Test your Gemini API key & image extraction
python backend/tests/test_gemini_key.py
```

---

### 4. Deploying to Vercel
1. Push project to GitHub.
2. Import project into Vercel.
3. Add environment variable: `GEMINI_API_KEY`.
4. Deploy (managed via `vercel.json` and `api/index.py`).
