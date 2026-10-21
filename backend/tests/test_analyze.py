"""
Integration tests for ClickShield URL Analysis API endpoints.
Tests validation rules, heuristic indicators, aliases, and error envelopes.
"""


def test_analyze_benign_url(client):
    """Legitimate URL returns Low risk score and no phishing classification."""
    payload = {"url": "https://www.wikipedia.org"}
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["url"] == "https://www.wikipedia.org"
    assert data["risk_level"] == "Low"
    assert data["risk_score"] < 0.30
    assert data["is_phishing"] is False
    assert data["is_mock"] is False
    assert isinstance(data["top_indicators"], list)
    assert "evaluated_at" in data


def test_analyze_phishing_url(client):
    """High-risk phishing signature triggers High risk level and phishing alert."""
    payload = {
        "url": "http://192.168.1.100/paypal/login.php",
        "referrer": "https://mail.example.com",
    }
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] == "High"
    assert data["risk_score"] >= 0.70
    assert data["is_phishing"] is True
    features = [ind["feature"] for ind in data["top_indicators"]]
    assert "ip_address_host" in features
    assert "brand_impersonation" in features


def test_analyze_url_contract_alias(client):
    """Verify that POST /api/v1/analyze/url works identically per api-contract.md."""
    payload = {"url": "https://github.com"}
    response = client.post("/api/v1/analyze/url", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] == "Low"
    assert data["is_phishing"] is False


def test_analyze_invalid_scheme_error_envelope(client):
    """Non-HTTP(S) schemes return 422 with standardized error envelope."""
    payload = {"url": "ftp://files.example.com/login"}
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "INVALID_URL"
    assert data["error"]["status_code"] == 422
    assert "Unsupported URL scheme" in data["error"]["message"]


def test_analyze_empty_url_error_envelope(client):
    """Empty target URL string returns 422 with standardized error envelope."""
    payload = {"url": "   "}
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "INVALID_URL"
    assert data["error"]["status_code"] == 422


def test_analyze_missing_body_field(client):
    """Missing required 'url' property returns standardized 422 error."""
    payload = {"referrer": "https://example.com"}
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "INVALID_URL"
    assert data["error"]["status_code"] == 422
    assert isinstance(data["error"]["details"], list)


def test_not_found_error_envelope(client):
    """Unmapped routes return standard 404 envelope rather than default HTML/plain text."""
    response = client.get("/api/v1/nonexistent-route")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert data["error"]["status_code"] == 404
