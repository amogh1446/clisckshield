"""
Health and diagnostics endpoint router.
Provides service status, version info, and component readiness states.
"""

from datetime import datetime, timezone
from fastapi import APIRouter

from app.core.config import settings
from app.schemas.analysis import HealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Backend Health Check",
    description="Returns backend uptime status, active environment, and component readiness.",
)
def get_health() -> HealthResponse:
    """Returns diagnostics and component availability for monitoring."""
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        model_loaded=False,  # Set to True once ML model artifact is loaded
        database_connected=False,  # Set to True once DB session is initialized
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
