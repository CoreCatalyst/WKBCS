import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from app.core.database import Base

class AIGenerationLog(Base):
    __tablename__ = "ai_generation_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id = Column(String(36), ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False)
    listing_id = Column(String(36), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    input_image_ids = Column(JSON, default=list, nullable=False)
    prompt_version = Column(String(50), default="v1.0-commercial", nullable=False)
    generated_content = Column(JSON, nullable=False)  # title, short_description, key_features, category, keywords
    model_provider = Column(String(50), default="gemini-1.5-flash", nullable=False)
    status = Column(String(50), default="GENERATED", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
