# ClickShield: AI-Powered Phishing Protection System

[![Status](https://img.shields.io/badge/Project%20Status-Phase%201%20Scaffolding-blue.svg)](#)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-teal.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React-cyan.svg)](https://react.dev/)
[![Extension](https://img.shields.io/badge/Extension-Chrome%20Manifest%20V3-brightgreen.svg)](#)
[![ML](https://img.shields.io/badge/Model-XGBoost%20%2B%20SHAP-orange.svg)](#)

A modular, multi-tier defense system designed to safeguard users against deceptive websites and credential harvesting attacks in real-time. Built as a college mini-project with industry-standard architectural principles.

---

## 📌 Project Overview

Traditional phishing detection relies heavily on static blocklists that lag behind zero-day phishing domains. This project combines:
1. **Pre-click URL Analysis**: Evaluating lexical, domain, and structural patterns before navigation.
2. **Post-click Webpage Analysis**: Inspecting DOM elements, login/credential forms, redirect chains, and brand impersonation clues.
3. **Machine Learning Classifier (XGBoost)**: Trained on verified phishing and benign datasets.
4. **Explainable AI (SHAP)**: Providing interpretable security indicators for why a URL is flagged.
5. **Real-time Chrome Extension (Manifest V3)**: Protecting users directly in their browser with low latency and interstitial warnings.
6. **React Analytics Dashboard**: Offering insights into detection history, risk scores, and model performance.

---

## 👥 4-Member Team Allocation

To ensure smooth parallel development, the project is structured across four primary responsibilities:

| Team Member | Area of Ownership | Primary Working Directory | Assigned Git Branch |
| :--- | :--- | :--- | :--- |
| **Member 1** | Machine Learning & Datasets | `ml/` | `feature/ml-model` |
| **Member 2** | FastAPI Backend & Risk Engine | `backend/` | `feature/backend` |
| **Member 3** | Chrome Manifest V3 Extension | `extension/` | `feature/extension` |
| **Member 4** | React Dashboard, Integration & QA | `dashboard/`, `tests/` | `feature/dashboard-qa` |

---

## 🌿 Git Branching Strategy

We follow a structured Git branching model to avoid merge conflicts and accidental breakages:

- **`main`**: Production/submission branch. Always clean, stable, and tested.
- **`develop`**: Integration branch. Team members merge completed features here for testing.
- **Feature Branches**:
  - `feature/ml-model`: Dataset preparation, feature engineering, model training, SHAP explainers.
  - `feature/backend`: FastAPI endpoints, API contract compliance, risk scoring engine.
  - `feature/extension`: Chrome Manifest V3 service worker, content scripts, popup, and warning screens.
  - `feature/dashboard-qa`: React user interface, integration tests, and end-to-end verification.

### Basic Git Workflow Commands (Windows PowerShell)

```powershell
# 1. Clone repository (or initialize)
git init
git add .
git commit -m "chore: initial phase 1 project scaffolding"

# 2. Create and switch to the develop branch
git branch -M main
git checkout -b develop

# 3. Each member branches off 'develop' to work on their feature:
# Member 1:
git checkout -b feature/ml-model
# Member 2:
git checkout -b feature/backend
# Member 3:
git checkout -b feature/extension
# Member 4:
git checkout -b feature/dashboard-qa
```

---

## 📂 Project Directory Structure

```text
phishing-protection/
├── backend/                  # FastAPI backend server & REST API
│   ├── app/
│   │   ├── api/              # API router and endpoint definitions
│   │   ├── core/             # Configuration, settings, and security constants
│   │   ├── schemas/          # Pydantic models for request/response validation
│   │   ├── services/         # Risk engine, ML inference glue, and URL parser
│   │   ├── db/               # Local database models and SQLite session setup
│   │   └── main.py           # Application entry point
│   ├── tests/                # Unit and endpoint tests for backend
│   ├── requirements.txt      # Python dependencies for backend
│   └── README.md
├── ml/                       # Machine Learning research and training pipeline
│   ├── data/                 # Raw and processed datasets (git-ignored CSVs)
│   ├── notebooks/            # Jupyter notebooks for EDA and experiment tracking
│   ├── src/                  # Production-ready Python modules for ML
│   │   ├── preprocessing.py  # Data cleaning and normalization
│   │   ├── feature_extraction.py # Lexical, host, and content feature extractors
│   │   ├── train.py          # XGBoost training script with cross-validation
│   │   ├── predict.py        # Model inference pipeline
│   │   └── explain.py        # SHAP explanation generator
│   ├── models/               # Saved model artifacts (.json / .joblib, git-ignored)
│   ├── evaluation/           # Evaluation metrics, confusion matrix, ROC plots
│   ├── requirements.txt      # ML-specific dependencies
│   └── README.md
├── extension/                # Chrome Extension (Manifest V3)
│   ├── manifest.json         # Extension metadata, permissions, and script bindings
│   ├── background/
│   │   └── service-worker.js # Event handling, pre-click inspection, backend communication
│   ├── content/
│   │   └── content-script.js # DOM parsing, form inspection, post-click telemetry
│   ├── popup/                # Extension popup UI (status, scan button, toggle)
│   ├── warning/              # Full-page interstitial warning for blocked high-risk sites
│   ├── lib/                  # Shared helper libraries
│   └── README.md
├── dashboard/                # Analytics & Investigation Dashboard (React)
│   ├── src/
│   │   ├── components/       # Reusable UI components (cards, badges, tables)
│   │   ├── pages/            # Views (Dashboard, History, URL Inspector)
│   │   ├── services/         # API client to communicate with FastAPI backend
│   │   └── App.jsx           # Main React component
│   ├── public/               # Static assets
│   ├── package.json          # Node dependencies and build scripts
│   └── README.md
├── tests/                    # Integration and end-to-end test suite
│   ├── integration/          # Multi-component workflow tests
│   └── fixtures/             # Safe mock payloads and HTML samples for tests
├── data/                     # Global test data guidelines & safe URL lists
│   └── README.md
├── docs/                     # Architectural and operational documentation
│   ├── architecture.md       # High-level architecture and system design
│   ├── api-contract.md       # REST API contract and schemas
│   └── development-guide.md  # Onboarding guide and coding guidelines
├── scripts/                  # Automation scripts (environment setup, linting)
├── .gitignore                # Git ignore rules for venv, node_modules, binaries
├── .env.example              # Sample environment variables template
└── README.md                 # Project root documentation (this file)
```

---

## 🛠️ Windows Setup & Installation Guide

### Prerequisites
- **Python**: 3.10 or higher ([python.org](https://www.python.org/downloads/))
- **Node.js**: v18 or higher ([nodejs.org](https://nodejs.org/))
- **Google Chrome**: Latest version (for extension loading)
- **Git**: Installed and configured

### 1. Backend Setup (Member 2 & general run)
Open PowerShell and navigate to the project root:

```powershell
# Navigate to backend
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Run backend (in Phase 2)
# uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Machine Learning Setup (Member 1)
```powershell
# Open a new PowerShell window, navigate to ml/
cd ml

# Create and activate an isolated ML venv
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install ML dependencies
pip install -r requirements.txt
```

### 3. Dashboard Setup (Member 4)
```powershell
# Navigate to dashboard/
cd dashboard

# Install npm packages
npm install

# Start local development server
npm run dev
```

### 4. Chrome Extension Setup (Member 3)
1. Open Google Chrome and enter `chrome://extensions/` in the address bar.
2. Toggle **Developer mode** on (top-right corner).
3. Click **Load unpacked** (top-left button).
4. Select the `extension/` directory from this project.

---

## 📅 Development Roadmap

- [x] **Phase 1: Project Scaffolding & Starter Documentation** (Current)
  - Directory structure, initial READMEs, `.gitignore`, `.env.example`, architecture, and API specs.
- [ ] **Phase 2: Minimal FastAPI Backend**
  - Health check endpoint and URL analysis endpoint with labeled mock responses.
- [ ] **Phase 3: Formalized API Contract & Schemas**
  - Validation schemas, test cases, and error envelopes.
- [ ] **Phase 4: ML Pipeline Implementation**
  - Feature extraction, dataset cleaning, XGBoost model training, evaluation, and SHAP explainability.
- [ ] **Phase 5: Backend Model Integration**
  - Connecting the trained model and risk scoring engine to the FastAPI service.
- [ ] **Phase 6: Chrome Extension Implementation**
  - Background service worker, DOM content script, interstitial warning page, and popup UI.
- [ ] **Phase 7: React Dashboard Development**
  - Real-time detection logs, risk score gauges, and URL inspection playground.
- [ ] **Phase 8: End-to-End Integration & Testing**
  - Automated integration tests, documentation polish, and final presentation preparation.

---

## 🛡️ Security, Privacy & Ethics Notice

1. **No Data Leakage**: User browsing URLs are never transmitted to unvetted external cloud AI services. All inference occurs locally on the FastAPI backend.
2. **Safe Test Data**: Never use live, weaponized phishing links during testing. Use synthetic test domains or verified academic test fixtures located in `tests/fixtures/`.
3. **No Model Overclaims**: Accuracy numbers must be grounded in verified test evaluation datasets (`ml/evaluation/`), not fabricated metrics.
