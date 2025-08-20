from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.database.database import Base

class CaseAssignment(Base):
    __tablename__ = "case_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

    # Ensure unique case-user combinations
    __table_args__ = (UniqueConstraint('case_id', 'user_id', name='unique_case_user_assignment'),)

    # Relationships
    case = relationship("Case", back_populates="assignments")
    user = relationship("User", back_populates="case_assignments", foreign_keys=[user_id])
    assigned_by_user = relationship("User", foreign_keys=[assigned_by])
