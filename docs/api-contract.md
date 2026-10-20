# API Contract Specification

This document defines the formal REST API contract between the FastAPI backend, the Chrome Extension, and the React Dashboard. All team members must adhere to these schemas.

- **Base URL**: `http://127.0.0.1:8000`
- **Current Version**: `v1` (`/api/v1`)
- **Format**: JSON (`Content-Type: application/json`)

---

## 1. System Health & Diagnostics

### `GET /api/v1/health`
Checks backend availability, database connectivity, and ML model loaded status.

#### Request
No parameters required.

#### Response (`200 OK`)
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "model_loaded": false,
  "database_connected": true,
  "environment": "development",
  "timestamp": "2026-10-20T12:00:00Z"
}
```

---

## 2. Pre-Click URL Analysis

### `POST /api/v1/analyze/url`
Analyzes a destination URL before navigation occurs. Uses lexical, domain features, and the ML classifier.

#### Request Body
```json
{
  "url": "http://192.168.1.1/paypal/login.php",
  "referrer": "https://mail.example.com",
  "client_timestamp": "2026-10-20T12:00:00Z"
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `url` | string | Yes | The destination URL to analyze. |
| `referrer` | string | No | The page origin where the link was encountered. |
| `client_timestamp` | string (ISO 8601) | No | Timestamp from client browser. |

#### Response (`200 OK`)
```json
{
  "url": "http://192.168.1.1/paypal/login.php",
  "risk_score": 0.88,
  "risk_level": "High",
  "is_phishing": true,
  "confidence": 0.92,
  "is_mock": true,
  "top_indicators": [
    {
      "feature": "uses_ip_address",
      "impact": 0.35,
      "description": "Host uses an raw IP address instead of a domain name."
    },
    {
      "feature": "brand_in_path",
      "impact": 0.28,
      "description": "Well-known brand name ('paypal') found in path on untrusted domain."
    },
    {
      "feature": "suspicious_token_count",
      "impact": 0.15,
      "description": "High frequency of security and login keywords."
    }
  ],
  "evaluated_at": "2026-10-20T12:00:01Z"
}
```

---

## 3. Post-Click Webpage Content Analysis

### `POST /api/v1/analyze/content`
Receives DOM inspection telemetry gathered by the Chrome content script after page render.

#### Request Body
```json
{
  "url": "http://example-suspicious-login.com/auth",
  "page_title": "Sign In to Your Account",
  "has_password_field": true,
  "has_credit_card_field": false,
  "form_action_url": "http://untrusted-third-party.ru/post.php",
  "is_https": false,
  "external_links_ratio": 0.85,
  "has_hidden_iframes": false,
  "client_timestamp": "2026-10-20T12:00:02Z"
}
```

#### Response (`200 OK`)
```json
{
  "url": "http://example-suspicious-login.com/auth",
  "risk_score": 0.94,
  "risk_level": "High",
  "is_phishing": true,
  "is_mock": true,
  "reasons": [
    "Password input field submitted over unencrypted HTTP",
    "Form action posts credentials to a mismatched foreign host (untrusted-third-party.ru)",
    "Abnormally high ratio of broken/external script references"
  ],
  "recommended_action": "BLOCK",
  "evaluated_at": "2026-10-20T12:00:03Z"
}
```

---

## 4. Detection History & Analytics (Dashboard)

### `GET /api/v1/history`
Returns recent detection events for display in the React dashboard.

#### Query Parameters
- `limit` (integer, default: 20, max: 100)
- `risk_level` (string, optional: `Low`, `Medium`, `High`)

#### Response (`200 OK`)
```json
{
  "total_records": 1,
  "records": [
    {
      "id": "det_982348a",
      "url": "http://192.168.1.1/paypal/login.php",
      "risk_level": "High",
      "risk_score": 0.88,
      "detected_at": "2026-10-20T12:00:01Z",
      "client_action_taken": "BLOCKED"
    }
  ]
}
```

---

## 5. Standard Error Envelopes

All errors return a predictable structure:

```json
{
  "error": {
    "code": "INVALID_URL",
    "message": "The provided target string is not a valid RFC-compliant URL.",
    "status_code": 422,
    "details": null
  }
}
```
