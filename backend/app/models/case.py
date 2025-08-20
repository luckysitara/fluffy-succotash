from sqlalchemy import Boolean, Column, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.database.database import Base
import enum

class CaseStatus(enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"

class CasePriority(enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class Case(Base):
    __tablename__ = "cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    status = Column(Enum(CaseStatus), nullable=False, default=CaseStatus.OPEN)
    priority = Column(Enum(CasePriority), nullable=False, default=CasePriority.MEDIUM)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    closed_at = Column(DateTime(timezone=True))

    # Relationships
    created_by_user = relationship("User", back_populates="created_cases", foreign_keys=[created_by])
    assigned_to_user = relationship("User", back_populates="assigned_cases", foreign_keys=[assigned_to])
    organization = relationship("Organization", back_populates="cases")
    evidence = relationship("Evidence", back_populates="case")
    audit_logs = relationship("AuditLog", back_populates="case")
    assignments = relationship("CaseAssignment", back_populates="case", cascade="all, delete-orphan")
