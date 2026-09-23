import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Noryvanta Business Marketplace"
    API_V1_STR: str = "/api/v1"
    APP_ENV: str = os.getenv("APP_ENV", "development")  # "development" | "staging" | "production"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "noryvanta-sovereign-commerce-ultra-secure-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # Database: Default to asynchronous SQLite for immediate local execution,
    # or PostgreSQL / Supabase when DATABASE_URL is set in environment.
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./noryvanta.db")
    
    # Redis configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Supabase credentials (optional for direct Supabase Auth/Storage SDK integration)
    SUPABASE_URL: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "https://noryvanta.in",
    ]
    
    # Regulatory Tax & Platform Fee defaults
    # IMPORTANT: 10% is the Noryvanta business-mandated platform commission.
    # This is deducted from the business owner's proceeds — NOT charged to the customer.
    PLATFORM_COMMISSION_PERCENT: float = 10.0  # 10% platform fee on vendor's transaction value
    TDS_SECTION_194O_PERCENT: float = 1.0     # 1.0% mandatory TDS on e-commerce operators (Section 194-O)
    DEFAULT_GST_RATE_PERCENT: float = 18.0   # Default GST slab

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
