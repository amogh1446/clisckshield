# Development & Collaboration Guide

Welcome to the team! This guide explains our workflow, Git practices, environment setup on Windows, and coding standards.

---

## 1. Team Responsibilities & Branches

| Member | Primary Focus | Feature Branch | Main Directories |
| :--- | :--- | :--- | :--- |
| **Member 1** | ML Model & Datasets | `feature/ml-model` | `ml/` |
| **Member 2** | FastAPI & Risk Engine | `feature/backend` | `backend/` |
| **Member 3** | Chrome Extension (MV3) | `feature/extension` | `extension/` |
| **Member 4** | Dashboard, Tests, QA | `feature/dashboard-qa` | `dashboard/`, `tests/` |

---

## 2. Git Workflow Explained (Step-by-Step)

We keep `main` stable and use `develop` to integrate work from all 4 teammates.

### Step 1: Starting Your Workday
Always pull the latest changes from `develop` before starting work:

```powershell
# Ensure you are on develop and have the latest updates
git checkout develop
git pull origin develop
```

### Step 2: Creating Your Feature Branch
Never commit directly to `main` or `develop`. Switch to your dedicated branch:

```powershell
# For Member 1 (ML):
git checkout -b feature/ml-model

# For Member 2 (Backend):
git checkout -b feature/backend

# For Member 3 (Extension):
git checkout -b feature/extension

# For Member 4 (Dashboard):
git checkout -b feature/dashboard-qa
```

### Step 3: Committing Changes
Make small, focused commits with meaningful commit messages:

```powershell
# Stage the files you modified
git add backend/app/api/

# Commit with a clear conventional message
git commit -m "feat(backend): implement url-analysis mock response"
```

### Step 4: Merging Back into Develop
When a feature is complete and tested:
1. Push your branch to the remote repository.
2. Open a Pull Request into `develop`.
3. Have at least one teammate review your code.
4. Merge after verification.

---

## 3. Windows Environment Setup

### Python Virtual Environment Setup (PowerShell)

If you see an execution policy error when activating the virtual environment in PowerShell, run PowerShell as Administrator once and run:
`Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

Then, within the project:

```powershell
# 1. Create a virtual environment inside backend/ or ml/
python -m venv venv

# 2. Activate the virtual environment
.\venv\Scripts\Activate.ps1

# (Your terminal prompt will now show '(venv)')

# 3. Install requirements
pip install -r requirements.txt

# 4. Deactivate when finished
deactivate
```

---

## 4. Coding & Clean Architecture Standards

### Python (Backend & ML)
- **PEP 8**: Follow standard Python conventions (snake_case for functions/variables, PascalCase for classes).
- **Type Hints**: Use type hints everywhere (`def analyze_url(target: str) -> RiskAssessment:`).
- **Explicit Imports**: Avoid wildcard imports (`from module import *`).
- **Docstrings**: Every class and function must have a clear docstring explaining inputs, outputs, and edge cases.

### JavaScript (Extension & Dashboard)
- **Manifest V3**: No remote code execution. All scripts must be bundled in the extension package.
- **Asynchronous Code**: Use modern `async/await` syntax instead of callback chains.
- **Error Handling**: Wrap network requests in `try...catch` blocks with user-friendly fallbacks when the backend is offline.

---

## 5. Security & Safety Rules

1. **Never Commit Secrets**: Do not commit API keys, database credentials, or tokens. Always read from `.env`.
2. **Never Commit Large Binaries**: Raw CSVs over 10MB and compiled model binaries (`.joblib`, `.pkl`) should stay local and are excluded by `.gitignore`.
3. **Safe Test URLs Only**:
   - Use `example.com`, `test.invalid`, or localhost for testing.
   - Do not browse or test live zero-day phishing sites on your development machine.
4. **Honest Metrics**: During development, mark uncalibrated responses with `"is_mock": true`. Never fabricate precision or recall metrics in documentation.
