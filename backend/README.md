# ClickShield Backend — FastAPI Phishing Detection API

This service hosts the REST API that evaluates URLs for phishing risk indicators, serves health diagnostics, and will integrate post-click DOM telemetry and detection history.

---

## 📁 Directory Architecture

```text
backend/
├── app/
│   ├── api/
│   │   ├── router.py               # Aggregates versioned routes
│   │   └── v1/
│   │       ├── health.py           # GET /health & GET /api/v1/health
│   │       └── analyze.py          # POST /api/v1/analyze & POST /api/v1/analyze/url
│   ├── core/
│   │   ├── config.py               # Pydantic Settings & environment variables
│   │   └── errors.py               # Custom exceptions & centralized error envelopes
│   ├── schemas/
│   │   ├── analysis.py             # URLAnalysisRequest, URLAnalysisResponse, IndicatorItem
│   │   └── error.py                # ErrorResponse & ErrorDetail envelopes
│   ├── services/
│   │   └── heuristic_analyzer.py   # Pure, zero-network static rule engine
│   ├── db/                         # Database models and session setup (Phase 5)
│   ├── __init__.py
│   └── main.py                     # App factory, CORS, exception handlers
├── tests/
│   ├── conftest.py                 # Shared pytest fixtures (TestClient)
│   ├── test_health.py              # Health endpoint integration tests
│   ├── test_analyze.py             # URL analysis integration tests
│   └── test_heuristic_service.py   # Heuristic rule engine unit tests
├── requirements.txt                # Python package dependencies
└── README.md
```

---

## 🚀 Local Windows Setup & Running

### 1. Create and Activate Virtual Environment
```powershell
cd backend
py -3.13 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Run Automated Tests
```powershell
.\venv\Scripts\pytest.exe -v
```
*(All 17 tests verify health checks, heuristic detection, input validation, and standard error envelopes.)*

### 3. Start Local Development Server
```powershell
.\venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000
```

- **Interactive API Documentation (Swagger)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative ReDoc View**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 📡 Live API Endpoints

### 1. `GET /health` & `GET /api/v1/health`
Returns system status, active version, and readiness flags.
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "model_loaded": false,
  "database_connected": false,
  "environment": "development",
  "timestamp": "2026-10-21T10:00:00Z"
}
```

### 2. `POST /api/v1/analyze` (and `POST /api/v1/analyze/url`)
Performs sub-millisecond static heuristic risk analysis on a target destination URL without visiting the remote site.

#### Request:
```json
{
  "url": "http://192.168.1.100/paypal/login.php",
  "referrer": "https://mail.example.com",
  "client_timestamp": "2026-10-21T10:00:00Z"
}
```

#### Response:
```json
{
  "url": "http://192.168.1.100/paypal/login.php",
  "risk_score": 0.9,
  "risk_level": "High",
  "is_phishing": true,
  "confidence": 0.9,
  "is_mock": false,
  "top_indicators": [
    {
      "feature": "ip_address_host",
      "impact": 0.35,
      "description": "Host uses a raw IP address instead of a registered domain name."
    },
    {
      "feature": "brand_impersonation",
      "impact": 0.3,
      "description": "Target brand keyword ('paypal') found on an untrusted host (192.168.1.100)."
    },
    {
      "feature": "suspicious_token",
      "impact": 0.15,
      "description": "Contains credential harvesting keyword: 'login'."
    },
    {
      "feature": "insecure_http_credentials",
      "impact": 0.1,
      "description": "Sensitive action or IP host accessed over unencrypted plain HTTP."
    }
  ],
  "evaluated_at": "2026-10-21T10:00:01Z"
}
```

### 3. Standardized Error Envelope (`422`, `404`, `500`)
```json
{
  "error": {
    "code": "INVALID_URL",
    "message": "Unsupported URL scheme 'ftp'. Only 'http' and 'https' are supported.",
    "status_code": 422,
    "details": null
  }
}
```

---

## 🤝 Teammate Integration Guide

- **Member 1 (Machine Learning)**:
  - The [`HeuristicAnalyzer`](file:///C:/Users/Chirag/clisckshield/backend/app/services/heuristic_analyzer.py) serves as your baseline and rule-based fallback.
  - When your XGBoost model is trained, we will wrap your inference script in `app/services/ml_analyzer.py` implementing the exact same `analyze(url)` method signature.
- **Member 3 (Chrome Extension)**:
  - Your `service-worker.js` can immediately send HTTP POST requests to `http://127.0.0.1:8000/api/v1/analyze`.
  - CORS is already pre-configured to allow `chrome-extension://*` origins.
- **Member 4 (Dashboard & QA)**:
  - The API contract is live and interactive at `http://127.0.0.1:8000/docs`.
  - Pytest test cases in `backend/tests/` can be extended with integration test fixtures.
