"""
Analysis endpoint router.
Exposes URL risk analysis to the Chrome Extension and React Dashboard.
"""

from fastapi import APIRouter, status

from app.schemas.analysis import URLAnalysisRequest, URLAnalysisResponse
from app.schemas.error import ErrorResponse
from app.services.heuristic_analyzer import heuristic_service

router = APIRouter(tags=["Analysis"])


@router.post(
    "/analyze",
    response_model=URLAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze Destination URL (Heuristic)",
    description=(
        "Evaluates the target URL for phishing risk indicators using static lexical and domain heuristics. "
        "Does NOT visit or fetch remote content. Returns a calibrated risk score and explanatory indicators."
    ),
    responses={
        422: {"model": ErrorResponse, "description": "Validation error or invalid URL format"}
    },
)
@router.post(
    "/analyze/url",
    response_model=URLAnalysisResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=True,
    summary="Analyze Destination URL (Alias)",
    description="Alias for POST /analyze complying with the specification in api-contract.md.",
    responses={
        422: {"model": ErrorResponse, "description": "Validation error or invalid URL format"}
    },
)
def analyze_url(payload: URLAnalysisRequest) -> URLAnalysisResponse:
    """
    Receives target URL, validates format, and computes heuristic phishing risk indicators.
    """
    return heuristic_service.analyze(payload.url)
