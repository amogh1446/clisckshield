"""
Unit and integration tests for ClickShield Health Check endpoints.
"""


def test_root_endpoint(client):
    """Verify that root endpoint returns project metadata and status."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "project" in data
    assert data["status"] == "operational"
    assert data["docs"] == "/docs"


def test_top_level_health_endpoint(client):
    """Verify that GET /health returns standard health payload."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "timestamp" in data
    assert data["model_loaded"] is False


def test_v1_health_endpoint(client):
    """Verify that GET /api/v1/health returns matching health payload."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "timestamp" in data
    assert data["environment"] == "development"
