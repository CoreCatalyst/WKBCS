import os
from typing import List, Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Noryvanta Business Marketplace"
    API_V1_STR: str = "/api/v1"
    APP_ENV: str = os.getenv("APP_ENV", "development")  # "development" | "staging" | "production"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "noryvanta-sovereign-commerce-ultra-secure-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))  # 15 minutes
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
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_SERVICE_KEY", ""))
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_SERVICE_KEY", ""))
    SUPABASE_STORAGE_BUCKET_PUBLIC: str = os.getenv("SUPABASE_STORAGE_BUCKET_PUBLIC", "noryvanta-public")
    SUPABASE_STORAGE_BUCKET_PRIVATE: str = os.getenv("SUPABASE_STORAGE_BUCKET_PRIVATE", "noryvanta-private")

    # ─── Media Optimization & Storage Constraints ───
    # Image Rules: 4-10 images, 100-250 KB target (up to 500 KB limit), 10 MB upload limit, 1200px max
    MINIMUM_LISTING_IMAGES: int = int(os.getenv("MINIMUM_LISTING_IMAGES", "4"))
    MAXIMUM_LISTING_IMAGES: int = int(os.getenv("MAXIMUM_LISTING_IMAGES", "10"))
    MAX_IMAGE_SIZE_BYTES: int = int(os.getenv("MAX_IMAGE_SIZE_BYTES", str(10 * 1024 * 1024)))  # 10 MB per image
    IMAGE_TARGET_MIN_KB: int = int(os.getenv("IMAGE_TARGET_MIN_KB", "100"))                     # 100 KB
    IMAGE_TARGET_MAX_KB: int = int(os.getenv("IMAGE_TARGET_MAX_KB", "250"))                     # 250 KB
    IMAGE_MAX_OPTIMIZED_KB: int = int(os.getenv("IMAGE_MAX_OPTIMIZED_KB", "500"))               # 500 KB quality ceiling
    IMAGE_MAX_DIMENSION: int = int(os.getenv("IMAGE_MAX_DIMENSION", "1200"))                     # 1200x1200 max px
    THUMBNAIL_MAX_DIMENSION: int = int(os.getenv("THUMBNAIL_MAX_DIMENSION", "300"))             # 300x300 px
    THUMBNAIL_TARGET_MIN_KB: int = int(os.getenv("THUMBNAIL_TARGET_MIN_KB", "20"))               # 20 KB
    THUMBNAIL_TARGET_MAX_KB: int = int(os.getenv("THUMBNAIL_TARGET_MAX_KB", "50"))               # 50 KB
    IMAGE_OUTPUT_FORMAT: str = os.getenv("IMAGE_OUTPUT_FORMAT", "WEBP").upper()                  # WebP preferred
    STRIP_EXIF_METADATA: bool = os.getenv("STRIP_EXIF_METADATA", "true").lower() in ("true", "1", "yes")

    # Video Rules: max 2, 10-15s recommended (30s max), 25 MB upload limit, 2-5 MB target (8 MB max), 720p H.264
    MAXIMUM_LISTING_VIDEOS: int = int(os.getenv("MAXIMUM_LISTING_VIDEOS", "2"))
    MAX_VIDEO_SIZE_BYTES: int = int(os.getenv("MAX_VIDEO_SIZE_BYTES", str(25 * 1024 * 1024)))  # 25 MB per video
    VIDEO_MIN_RECOMMENDED_DURATION_SECONDS: int = int(os.getenv("VIDEO_MIN_RECOMMENDED_DURATION_SECONDS", "10"))
    VIDEO_MAX_RECOMMENDED_DURATION_SECONDS: int = int(os.getenv("VIDEO_MAX_RECOMMENDED_DURATION_SECONDS", "15"))
    VIDEO_MAX_DURATION_SECONDS: int = int(os.getenv("VIDEO_MAX_DURATION_SECONDS", "30"))        # 30s max duration
    VIDEO_TARGET_MIN_MB: float = float(os.getenv("VIDEO_TARGET_MIN_MB", "2.0"))                 # 2 MB target
    VIDEO_TARGET_MAX_MB: float = float(os.getenv("VIDEO_TARGET_MAX_MB", "5.0"))                 # 5 MB target
    VIDEO_MAX_OPTIMIZED_MB: float = float(os.getenv("VIDEO_MAX_OPTIMIZED_MB", "8.0"))           # 8 MB upper limit
    VIDEO_MAX_RESOLUTION: str = os.getenv("VIDEO_MAX_RESOLUTION", "720p")
    VIDEO_CODEC: str = os.getenv("VIDEO_CODEC", "h264")

    # Cloudflare R2 / S3 Custom Storage
    CLOUDFLARE_R2_ACCOUNT_ID: str = os.getenv("CLOUDFLARE_R2_ACCOUNT_ID", "")
    CLOUDFLARE_R2_BUCKET: str = os.getenv("CLOUDFLARE_R2_BUCKET", "")
    CLOUDFLARE_R2_ACCESS_KEY_ID: str = os.getenv("CLOUDFLARE_R2_ACCESS_KEY_ID", "")
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: str = os.getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY", "")
    CLOUDFLARE_R2_PUBLIC_DOMAIN: str = os.getenv("CLOUDFLARE_R2_PUBLIC_DOMAIN", "")
    STORAGE_ENDPOINT_URL: Optional[str] = os.getenv("STORAGE_ENDPOINT_URL", None)
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = [
        orig.strip()
        for orig in os.getenv(
            "CORS_ALLOWED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,https://noryvantaglobal.com,https://www.noryvantaglobal.com"
        ).split(",")
        if orig.strip()
    ]
    
    # Category-based Platform Fee configuration
    PLATFORM_FEE_WHOLESALER: float = float(os.getenv("PLATFORM_FEE_WHOLESALER", "3.20"))
    PLATFORM_FEE_DISTRIBUTOR: float = float(os.getenv("PLATFORM_FEE_DISTRIBUTOR", "5.20"))
    PLATFORM_FEE_SERVICES: float = float(os.getenv("PLATFORM_FEE_SERVICES", "5.20"))
    PLATFORM_FEE_RETAILER: float = float(os.getenv("PLATFORM_FEE_RETAILER", "8.20"))
    PLATFORM_COMMISSION_PERCENT: float = 5.20  # Default fallback 5.20% (Services/Distributor)
    TDS_SECTION_194O_PERCENT: float = 1.0     # 1.0% mandatory TDS on e-commerce operators (Section 194-O)
    DEFAULT_GST_RATE_PERCENT: float = 18.0   # Default GST slab

    # Authentication & OTP Mode (MSG91 SMS Gateway Integration)
    DEV_MODE_OTP: bool = os.getenv(
        "DEV_MODE_OTP",
        "false" if os.getenv("APP_ENV", "").lower() == "production" else "true"
    ).lower() in ("true", "1", "yes")
    SMS_PROVIDER: str = os.getenv("SMS_PROVIDER", "msg91")  # "msg91" | "mock"
    MSG91_AUTH_KEY: str = os.getenv("MSG91_AUTH_KEY", "")
    MSG91_SENDER_ID: str = os.getenv("MSG91_SENDER_ID", "NORYVT")
    MSG91_TEMPLATE_ID: str = os.getenv("MSG91_TEMPLATE_ID", "")
    MSG91_DLT_TE_ID: str = os.getenv("MSG91_DLT_TE_ID", "")
    MSG91_ROUTE: str = os.getenv("MSG91_ROUTE", "4")  # 4 = Transactional OTP
    OTP_TTL_MINUTES: int = int(os.getenv("OTP_TTL_MINUTES", "5"))
    OTP_MAX_ATTEMPTS: int = int(os.getenv("OTP_MAX_ATTEMPTS", "3"))
    OTP_RATE_LIMIT_SECONDS: int = int(os.getenv("OTP_RATE_LIMIT_SECONDS", "60"))

    # Seed Data Flag (strictly disabled in production)
    SEED_DEMO_DATA: bool = os.getenv("SEED_DEMO_DATA", "false").lower() in ("true", "1", "yes")

    # Payment Gateway: Razorpay
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")
    RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

    # Payment Gateway: Cashfree
    CASHFREE_APP_ID: str = os.getenv("CASHFREE_APP_ID", os.getenv("CASHFREE_CLIENT_ID", ""))
    CASHFREE_CLIENT_ID: str = os.getenv("CASHFREE_CLIENT_ID", "")
    CASHFREE_SECRET_KEY: str = os.getenv("CASHFREE_SECRET_KEY", os.getenv("CASHFREE_CLIENT_SECRET", ""))
    CASHFREE_CLIENT_SECRET: str = os.getenv("CASHFREE_CLIENT_SECRET", "")
    CASHFREE_WEBHOOK_SECRET: str = os.getenv("CASHFREE_WEBHOOK_SECRET", "")

    # AI Listing Assistant Provider (Gemini / OpenAI abstraction)
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "gemini")  # "gemini" | "openai"
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", os.getenv("AI_API_KEY", ""))
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # Email Provider (Resend API)
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "Noryvanta Global <support@noryvantaglobal.com>")

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

    # Object Storage (Supabase Storage / AWS S3)
    STORAGE_PROVIDER: str = os.getenv("STORAGE_PROVIDER", "supabase")  # "supabase" | "s3" | "local"
    STORAGE_BUCKET: str = os.getenv("STORAGE_BUCKET", "noryvanta-assets")
    STORAGE_REGION: str = os.getenv("STORAGE_REGION", "ap-south-1")
    STORAGE_ACCESS_KEY: str = os.getenv("STORAGE_ACCESS_KEY", "")
    STORAGE_SECRET_KEY: str = os.getenv("STORAGE_SECRET_KEY", "")
    STORAGE_SIGNED_URL_EXPIRES_SECONDS: int = int(os.getenv("STORAGE_SIGNED_URL_EXPIRES_SECONDS", "900"))  # 15 minutes

    @property
    def is_dev_otp_allowed(self) -> bool:
        """Development OTP mode is strictly forbidden in production."""
        return self.APP_ENV in ("development", "test") and self.DEV_MODE_OTP

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        """
        Enforces strict production secret validation.
        Prevents silent fallback to insecure default secrets in production.
        """
        if self.APP_ENV == "production":
            insecure_keys = [
                "noryvanta-sovereign-commerce-ultra-secure-key-2026",
                "changethisinproduction",
                "secret",
                "default",
            ]
            key = (self.SECRET_KEY or "").strip()
            if not key or key in insecure_keys or len(key) < 32:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: A secure, unique SECRET_KEY (at least 32 characters) "
                    "must be explicitly set in the environment variables when APP_ENV=production. "
                    "Silently falling back to insecure or default secrets is strictly forbidden."
                )
        return self

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

settings = Settings()
