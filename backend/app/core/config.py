"""
Application Configuration Module.

Reads environment variables with sensible defaults for local development.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "AI-Powered Phishing Protection API"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Server Configuration
    API_HOST: str = "127.0.0.1"
    API_PORT: int = 8000
    API_V1_PREFIX: str = "/api/v1"

    # CORS Settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "chrome-extension://*",
    ]

    # Model Artifact Paths
    MODEL_PATH: str = "ml/models/xgboost_phishing_model.json"
    EXPLAINER_PATH: str = "ml/models/shap_explainer.joblib"

    # Risk Scoring Thresholds
    RISK_THRESHOLD_LOW: float = 0.30
    RISK_THRESHOLD_HIGH: float = 0.70

    # Database
    DATABASE_URL: str = "sqlite:///./phishing_protection.db"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
