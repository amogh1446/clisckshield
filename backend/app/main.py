"""
ClickShield Backend Application Entry Point.

Configures FastAPI, CORS middleware, centralized exception handling,
and mounts API v1 routers.
"""

from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import register_error_handlers
from app.api.router import api_router
from app.schemas.analysis import HealthResponse

# Initialize FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for ClickShield - AI-Powered Phishing Protection System.",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure Cross-Origin Resource Sharing (CORS)
# Supports Chrome Extension origins and local dashboard development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register uniform error envelope handlers
register_error_handlers(app)

# Mount versioned API routes (/api/v1)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["System"])
def root():
    """Root metadata endpoint."""
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "operational",
        "docs": "/docs",
        "api_v1": settings.API_V1_PREFIX,
    }


@app.get("/health", response_model=HealthResponse, tags=["System"])
def top_level_health() -> HealthResponse:
    """Convenience top-level health check endpoint mirroring /api/v1/health."""
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        model_loaded=False,
        database_connected=False,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
