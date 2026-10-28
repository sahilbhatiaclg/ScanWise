# ScanWise — Git Branching Guide

---

## Current State

- **Base branch:** `main` (contains schema, seed data, docs, empty backend/frontend scaffolding)
- **Remote:** `origin/main`
- **Working tree:** Clean

---

## Part 1: Creating Feature Branches

### Strategy: Branch Per Layer

```
main (base — schema, docs, project structure)
 ├── backend       ← Python DB layer (config, db.py, repos, services, routes)
 ├── frontend      ← React/Flutter/HTML frontend
 └── auth          ← Authentication (JWT, OTP) — or merge into backend
```

> [!NOTE]
> Keep branch names simple. The key rule is: **always create new branches FROM `main`**.

---

### Create the Frontend Branch

```powershell
# Make sure you're on main and it's clean
cd c:\Users\SAHIL\Desktop\ScanWise
git checkout main
git pull origin main

# Create and switch to the frontend branch
git checkout -b frontend
```

You're now on `frontend`. Any commits you make here won't affect `main`.

### Create the Backend Branch

```powershell
# Go back to main first
git checkout main

# Create and switch to the backend branch
git checkout -b backend
```

### Create Any Other Branch

```powershell
# Always start from main
git checkout main
git checkout -b <your-branch-name>

# Examples:
# git checkout -b auth
# git checkout -b ci-cd
```

---

## Part 2: Push Branches to Remote (GitHub)

After making commits on a branch, push it:

```powershell
# First push of a new branch (sets up tracking)
git push -u origin frontend

# Subsequent pushes (tracking is already set)
git push
```

---

## Part 3: Switching Between Branches

### Basic Switching

```powershell
# Switch to frontend
git checkout frontend

# Switch to backend
git checkout backend

# Switch back to main
git checkout main
```

### Check Which Branch You're On

```powershell
git branch          # shows all local branches, * marks the current one
git status          # also shows the current branch at the top
```

### List All Branches (Local + Remote)

```powershell
git branch -a
```

---

## Part 4: Working on a Branch (Daily Workflow)

### Step-by-step: Write Code on a Branch

```powershell
# 1. Switch to the branch you want to work on
git checkout frontend

# 2. Make sure it's up to date (if working with others)
git pull origin frontend

# 3. Write your code, edit files, etc.
#    ... (do your work) ...

# 4. Stage your changes
git add .                          # stage everything
# OR stage specific files:
git add frontend/src/App.jsx

# 5. Commit with a descriptive message
git commit -m "feat: add login page UI"

# 6. Push to remote
git push
```

### Switching Mid-Work (Uncommitted Changes)

If you're working on `frontend` but need to quickly check or fix something on `backend`:

**Option A: Commit first (recommended)**
```powershell
git add .
git commit -m "wip: partial login page"
git checkout backend
# ... do your work there ...
git checkout frontend       # come back
```

**Option B: Stash (temporary save without committing)**
```powershell
git stash                           # saves uncommitted changes
git checkout backend
# ... do your work there, commit, etc ...
git checkout frontend
git stash pop                       # restores your saved changes
```

> [!CAUTION]
> **Never switch branches with uncommitted changes** without stashing or committing first. Git may refuse the switch or — worse — carry uncommitted files into the wrong branch.

---

## Part 5: Merging a Branch Back into Main

When a feature branch is complete and tested:

```powershell
# 1. Switch to main
git checkout main
git pull origin main

# 2. Merge the feature branch
git merge backend

# 3. Resolve conflicts if any (Git will tell you which files)
#    Edit the conflicted files, then:
#    git add <resolved-file>
#    git commit

# 4. Push the updated main
git push origin main

# 5. (Optional) Delete the branch after merge
git branch -d backend          # local
git push origin --delete backend  # remote
```

> [!TIP]
> If you're using GitHub, you can also merge via **Pull Requests** (PRs) on the GitHub website — this gives you a visual diff and merge button. Push your branch, then go to GitHub → "Compare & pull request".

---

## Quick Reference Card

| Action | Command |
|---|---|
| See current branch | `git branch` |
| Create + switch to new branch | `git checkout -b branch-name` |
| Switch to existing branch | `git checkout branch-name` |
| List all branches | `git branch -a` |
| Stage all changes | `git add .` |
| Commit | `git commit -m "message"` |
| Push (first time) | `git push -u origin branch-name` |
| Push (after first time) | `git push` |
| Pull latest | `git pull` |
| Stash changes | `git stash` / `git stash pop` |
| Merge branch into main | `git checkout main && git merge branch-name` |
| Delete branch (local) | `git branch -d branch-name` |
| Delete branch (remote) | `git push origin --delete branch-name` |

---

## Recommended Branch Order for ScanWise

| Order | Branch | What to Build | Depends On |
|---|---|---|---|
| 1️⃣ | `backend` | `config.py`, `db.py`, `extensions.py`, all repos, services, routes | `main` (schema exists) |
| 2️⃣ | `frontend` | UI pages, API calls | Can start in parallel with backend |

