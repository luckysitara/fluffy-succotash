from sqlalchemy import Column, String, Text, Boolean, DateTime, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.database.database import Base

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text)
    plan = Column(String(50), default="free", nullable=False)
    max_users = Column(Integer, default=10, nullable=False)
    max_cases = Column(Integer, default=50, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    users = relationship("User", back_populates="organization")
    cases = relationship("Case", back_populates="organization")
    audit_logs = relationship("AuditLog", back_populates="organization")
    evidence = relationship("Evidence", back_populates="organization")
