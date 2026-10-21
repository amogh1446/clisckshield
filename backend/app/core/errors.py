"""
ClickShield Centralized Error Handling Module.

Defines custom application exceptions and FastAPI exception handlers to
guarantee that all client errors conform to the standard error envelope.
"""

from typing import Any, Optional
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class ClickShieldException(Exception):
    """Base exception for all domain-level ClickShield errors."""

    def __init__(
        self,
        message: str,
        code: str = "CLICKSHIELD_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Any] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class InvalidURLException(ClickShieldException):
    """Raised when an analyzed URL violates RFC format or has an invalid scheme."""

    def __init__(
        self,
        message: str = "The provided target string is not a valid HTTP/HTTPS URL.",
        details: Optional[Any] = None,
    ):
        super().__init__(
            message=message,
            code="INVALID_URL",
            status_code=422,
            details=details,
        )


def clickshield_exception_handler(_: Request, exc: ClickShieldException) -> JSONResponse:
    """Handles domain-level ClickShieldException."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "status_code": exc.status_code,
                "details": exc.details,
            }
        },
    )


def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Transforms Pydantic validation errors into the standardized ClickShield error envelope.
    """
    formatted_errors = []
    has_url_error = False

    for err in exc.errors():
        field_path = " -> ".join(str(loc) for loc in err.get("loc", []))
        msg = err.get("msg", "Invalid value")
        formatted_errors.append(f"{field_path}: {msg}")
        if "url" in str(err.get("loc", [])):
            has_url_error = True

    code = "INVALID_URL" if has_url_error else "VALIDATION_ERROR"
    message = (
        "The provided URL is invalid or malformed."
        if has_url_error
        else "One or more request parameters failed validation."
    )

    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": code,
                "message": message,
                "status_code": 422,
                "details": formatted_errors,
            }
        },
    )


def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Wraps standard HTTP errors (such as 404 Not Found) into the standard envelope."""
    code_map = {
        status.HTTP_404_NOT_FOUND: "NOT_FOUND",
        status.HTTP_405_METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
        status.HTTP_400_BAD_REQUEST: "BAD_REQUEST",
        status.HTTP_401_UNAUTHORIZED: "UNAUTHORIZED",
        status.HTTP_403_FORBIDDEN: "FORBIDDEN",
    }
    code = code_map.get(exc.status_code, "HTTP_ERROR")
    message = str(exc.detail) if exc.detail else "An HTTP error occurred."

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "status_code": exc.status_code,
                "details": None,
            }
        },
    )


def generic_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    """Fallback handler for uncaught server errors (500). Prevents leaking internal stack traces."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred while processing the request.",
                "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "details": None,
            }
        },
    )


def register_error_handlers(app: FastAPI) -> None:
    """Registers all standardized error handlers on the FastAPI application instance."""
    app.add_exception_handler(ClickShieldException, clickshield_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
