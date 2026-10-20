"""
FastAPI Application Entry Point.

Note: This file is currently a placeholder for Phase 1.
Full endpoint implementation with clearly labeled mock responses
will be integrated in Phase 2.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API for AI-Powered Phishing Protection System (Phase 1 Scaffolding)",
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """Root health and status endpoint."""
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "phase": "Phase 1 - Scaffolding Complete",
        "documentation": "/docs",
    }
