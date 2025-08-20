from sqlalchemy import Boolean, Column, String, DateTime, Text, ForeignKey, Enum, JSON, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.database.database import Base
import enum

class EvidenceType(enum.Enum):
    FILE = "FILE"
    URL = "URL"
    IP_ADDRESS = "IP_ADDRESS"
    DOMAIN = "DOMAIN"
    EMAIL = "EMAIL"
    PHONE = "PHONE"
    SOCIAL_MEDIA = "SOCIAL_MEDIA"
    DOCUMENT = "DOCUMENT"
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    AUDIO = "AUDIO"
    TEXT = "TEXT"
    DATABASE = "DATABASE"
    FTP = "FTP"
    SERVER = "SERVER"
    PII_ANALYSIS = "PII_ANALYSIS"
    NETWORK_ANALYSIS = "NETWORK_ANALYSIS"
    OTHER = "OTHER"

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    type = Column(Enum(EvidenceType), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    file_path = Column(String(500))
    file_hash = Column(String(128))
    data_info = Column(JSON)
    tags = Column(String(500))
    is_verified = Column(Boolean, default=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    case = relationship("Case", back_populates="evidence")
    uploaded_by_user = relationship("User", back_populates="uploaded_evidence", foreign_keys=[uploaded_by])
    organization = relationship("Organization", back_populates="evidence")
