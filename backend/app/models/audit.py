import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id = Column(String(36), index=True, nullable=True)
    actor_role = Column(String(50), nullable=True)
    action = Column(String(100), index=True, nullable=False)
    entity_type = Column(String(100), index=True, nullable=False)
    entity_id = Column(String(36), index=True, nullable=False)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
