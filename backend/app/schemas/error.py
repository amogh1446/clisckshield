"""
Standardized error schema for ClickShield API.
Ensures all errors returned to the Chrome extension and React dashboard
follow a predictable, uniform structure.
"""

from typing import Any, Optional
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str = Field(..., description="Machine-readable error code", examples=["INVALID_URL"])
    message: str = Field(
        ...,
        description="Human-readable explanation of the error",
        examples=["The provided target string is not a valid HTTP/HTTPS URL."],
    )
    status_code: int = Field(..., description="HTTP status code", examples=[422])
    details: Optional[Any] = Field(None, description="Optional extra diagnostic details or field errors")


class ErrorResponse(BaseModel):
    error: ErrorDetail
