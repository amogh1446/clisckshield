"""
Pydantic models defining the contracts for health checks and URL/content analysis.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., examples=["healthy"])
    version: str = Field(..., examples=["0.1.0"])
    model_loaded: bool = Field(..., examples=[False])
    database_connected: bool = Field(..., examples=[True])
    environment: str = Field(..., examples=["development"])
    timestamp: str


class URLAnalysisRequest(BaseModel):
    url: str = Field(
        ...,
        description="Target destination URL to evaluate",
        examples=["http://example.com/login"],
    )
    referrer: Optional[str] = Field(
        None,
        description="Referring page origin",
        examples=["https://mail.example.com"],
    )
    client_timestamp: Optional[str] = Field(None, description="Timestamp from client browser")


class IndicatorItem(BaseModel):
    feature: str = Field(..., description="Name of the detected risk feature")
    impact: float = Field(..., description="Estimated risk contribution between 0.0 and 1.0")
    description: str = Field(..., description="Human-readable explanation of why this is suspicious")


class URLAnalysisResponse(BaseModel):
    url: str
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Composite risk score from 0.0 to 1.0")
    risk_level: str = Field(..., description="Low, Medium, or High")
    is_phishing: bool
    confidence: float = Field(..., ge=0.0, le=1.0)
    is_mock: bool = Field(False, description="True indicates simulated/placeholder response, False indicates live heuristic or ML evaluation")
    top_indicators: List[IndicatorItem] = Field(default_factory=list)
    evaluated_at: str


class ContentAnalysisRequest(BaseModel):
    url: str
    page_title: Optional[str] = None
    has_password_field: bool = False
    has_credit_card_field: bool = False
    form_action_url: Optional[str] = None
    is_https: bool = True
    external_links_ratio: float = 0.0
    has_hidden_iframes: bool = False
    client_timestamp: Optional[str] = None


class ContentAnalysisResponse(BaseModel):
    url: str
    risk_score: float
    risk_level: str
    is_phishing: bool
    is_mock: bool = True
    reasons: List[str] = Field(default_factory=list)
    recommended_action: str = Field(..., description="ALLOW, WARN, or BLOCK")
    evaluated_at: str
