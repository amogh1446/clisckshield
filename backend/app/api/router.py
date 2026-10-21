"""
Main API Router for ClickShield.
Aggregates all versioned endpoint routers.
"""

from fastapi import APIRouter

from app.api.v1 import health, analyze

api_router = APIRouter()

# Include v1 endpoints
api_router.include_router(health.router)
api_router.include_router(analyze.router)
