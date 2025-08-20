from sqlalchemy import Boolean, Column, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.database.database import Base
import enum

class UserRole(enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ORG_ADMIN = "ORG_ADMIN"
    STAFF_USER = "STAFF_USER"
    INDIVIDUAL_USER = "INDIVIDUAL_USER"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.INDIVIDUAL_USER)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    password_changed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="users")
    created_cases = relationship("Case", back_populates="created_by_user", foreign_keys="Case.created_by")
    assigned_cases = relationship("Case", back_populates="assigned_to_user", foreign_keys="Case.assigned_to")
    uploaded_evidence = relationship("Evidence", back_populates="uploaded_by_user", foreign_keys="Evidence.uploaded_by")
    audit_logs = relationship("AuditLog", back_populates="user")
    case_assignments = relationship("CaseAssignment", back_populates="user", foreign_keys="CaseAssignment.user_id")
