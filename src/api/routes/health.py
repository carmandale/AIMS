"""Health check endpoints"""
from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter
from src.core.config import settings

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health_check() -> Dict[str, Any]:
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.app_version,
        "service": settings.app_name
    }


@router.get("/detailed")
async def health_check_detailed() -> Dict[str, Any]:
    """Detailed health check with component status"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.app_version,
        "service": settings.app_name,
        "components": {
            "api": "operational",
            "database": "operational",  # TODO: Add actual DB check
            "scheduler": "operational"  # TODO: Add APScheduler check
        },
        "environment": {
            "timezone": settings.timezone,
            "log_level": settings.log_level
        }
    }