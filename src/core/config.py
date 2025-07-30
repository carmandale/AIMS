"""Configuration settings for AIMS"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False
    )
    
    # API Configuration
    api_host: str = Field(default="0.0.0.0", description="API host")
    api_port: int = Field(default=8002, description="API port")
    api_reload: bool = Field(default=True, description="API reload on change")
    
    # Security
    secret_key: str = Field(default="development-secret-key", description="Secret key for JWT")
    cors_origins: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:3002",
            "http://localhost:8002",
            "http://localhost:5173",
            "http://localhost:5174",
        ],
        description="CORS allowed origins"
    )

    # Database
    database_url: str = Field(default="sqlite:///./aims.db", description="Database connection URL")

    # SnapTrade Configuration
    snaptrade_client_id: str = Field(default="", description="SnapTrade Client ID")
    snaptrade_consumer_key: str = Field(default="", description="SnapTrade Consumer Key")
    snaptrade_environment: str = Field(
        default="sandbox", description="SnapTrade environment (sandbox/production)"
    )

    # Logging
    log_level: str = Field(default="INFO", description="Logging level")

    # Timezone
    timezone: str = Field(default="America/Chicago", description="Default timezone")

    # Application metadata
    app_name: str = Field(default="AIMS", description="Application name")
    app_version: str = Field(default="0.1.0", description="Application version")
    app_description: str = Field(
        default="Automated Investment Management System - Phase 1",
        description="Application description",
    )


settings = Settings()
