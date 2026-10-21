"""
Pytest configuration and shared test fixtures for ClickShield Backend.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client():
    """Provides a thread-safe FastAPI TestClient instance."""
    with TestClient(app) as test_client:
        yield test_client
