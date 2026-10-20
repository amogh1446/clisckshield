# Backend Service — FastAPI Phishing Detection API

This service hosts the REST API that evaluates URLs, receives DOM telemetry from the Chrome extension, queries the ML inference engine, and serves detection history to the dashboard.

---

## 📁 Directory Architecture

```text
backend/
├── app/
│   ├── api/          # Route handlers (Endpoints for /health, /analyze, /history)
│   ├── core/         # Central configuration, environment loading, logging
│   ├── schemas/      # Pydantic models (data schemas for requests & responses)
│   ├── services/     # Business logic (URL parsing, feature extraction, ML inference glue)
│   ├── db/           # SQLite database models and session setup
│   ├── __init__.py
│   └── main.py       # FastAPI application initialization & middleware
├── tests/            # Automated test suite (Pytest)
├── requirements.txt  # Python package dependencies
└── README.md         # This documentation file
```

---

## 🚀 Running on Windows (Local Development)

### 1. Setup Virtual Environment
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Start the Server
```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **Interactive API Documentation (Swagger UI)**: `http://127.0.0.1:8000/docs`
- **Alternative Documentation (ReDoc)**: `http://127.0.0.1:8000/redoc`

---

## 📌 Phase Status

- **Current (Phase 1)**: Architecture scaffolding and placeholder definitions created.
- **Next (Phase 2)**: Implementation of `/api/v1/health` and `/api/v1/analyze/url` with clearly labeled mock responses and unit tests.
