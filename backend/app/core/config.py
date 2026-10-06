import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

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
    
    # Redis & Background Tasks (Celery)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
    
    # Supabase credentials (optional for Supabase Auth/Storage SDK integration)
    SUPABASE_URL: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "https://noryvanta.in",
    ]
    
    # Category-based Platform Fee configuration
    PLATFORM_FEE_WHOLESALER: float = float(os.getenv("PLATFORM_FEE_WHOLESALER", "3.20"))
    PLATFORM_FEE_DISTRIBUTOR: float = float(os.getenv("PLATFORM_FEE_DISTRIBUTOR", "5.20"))
    PLATFORM_FEE_SERVICES: float = float(os.getenv("PLATFORM_FEE_SERVICES", "5.20"))
    PLATFORM_FEE_RETAILER: float = float(os.getenv("PLATFORM_FEE_RETAILER", "8.20"))
    PLATFORM_COMMISSION_PERCENT: float = 5.20  # Default fallback 5.20% (Services/Distributor)
    TDS_SECTION_194O_PERCENT: float = 1.0     # 1.0% mandatory TDS on e-commerce operators (Section 194-O)
    DEFAULT_GST_RATE_PERCENT: float = 18.0   # Default GST slab

    # Listing Rules (Section H)
    MINIMUM_LISTING_IMAGES: int = 6
    MAXIMUM_LISTING_IMAGES: int = 12

    # Authentication & OTP Mode
    DEV_MODE_OTP: bool = os.getenv("DEV_MODE_OTP", "true").lower() in ("true", "1", "yes")

    # Payment Gateway: Razorpay (Sandbox / Test keys in development)
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "rzp_test_noryvanta_sandbox")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "mock_razorpay_secret_key")
    RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "mock_razorpay_webhook_secret")

    # Payment Gateway: Cashfree (Sandbox / Test keys in development)
    CASHFREE_APP_ID: str = os.getenv("CASHFREE_APP_ID", os.getenv("CASHFREE_CLIENT_ID", "cf_test_noryvanta_sandbox"))
    CASHFREE_CLIENT_ID: str = os.getenv("CASHFREE_CLIENT_ID", "cf_test_noryvanta_sandbox")
    CASHFREE_SECRET_KEY: str = os.getenv("CASHFREE_SECRET_KEY", os.getenv("CASHFREE_CLIENT_SECRET", "mock_cashfree_secret_key"))
    CASHFREE_CLIENT_SECRET: str = os.getenv("CASHFREE_CLIENT_SECRET", "mock_cashfree_secret_key")
    CASHFREE_WEBHOOK_SECRET: str = os.getenv("CASHFREE_WEBHOOK_SECRET", "mock_cashfree_webhook_secret")

    # AI Listing Assistant Provider (Gemini / OpenAI abstraction)
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "gemini")  # "gemini" | "openai" | "mock"
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", os.getenv("AI_API_KEY", ""))
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # Email Provider (Resend API)
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "Noryvanta <notifications@noryvanta.in>")

    # Social Login (Google OAuth)
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")

    # Security & Bot Protection (Cloudflare Turnstile)
    CLOUDFLARE_TURNSTILE_SITE_KEY: str = os.getenv("CLOUDFLARE_TURNSTILE_SITE_KEY", "")
    CLOUDFLARE_TURNSTILE_SECRET_KEY: str = os.getenv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "")

    # Geocoding & Location (Google Maps)
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")

    # Push Notifications (Firebase FCM)
    FIREBASE_FCM_CREDENTIALS: Optional[str] = os.getenv("FIREBASE_FCM_CREDENTIALS", None)
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "noryvanta-prod")

    # Object Storage (Supabase Storage / S3)
    STORAGE_PROVIDER: str = os.getenv("STORAGE_PROVIDER", "local")  # "local" | "s3" | "supabase"
    STORAGE_BUCKET: str = os.getenv("STORAGE_BUCKET", "noryvanta-assets")
    STORAGE_REGION: str = os.getenv("STORAGE_REGION", "ap-south-1")
    STORAGE_ACCESS_KEY: str = os.getenv("STORAGE_ACCESS_KEY", "")
    STORAGE_SECRET_KEY: str = os.getenv("STORAGE_SECRET_KEY", "")

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

settings = Settings()
