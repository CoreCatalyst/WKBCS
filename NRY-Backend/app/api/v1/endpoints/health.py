from datetime import datetime, timezone
from fastapi import APIRouter

router = APIRouter()

@router.get("/health", summary="Health check endpoint")
async def health_check():
    return {
        "status": "healthy",
        "service": "Noryvanta Core API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": "production-ready",
        "version": "1.0.0"
    }
