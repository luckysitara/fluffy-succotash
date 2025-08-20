from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

class AuditLogBase(BaseModel):
    user_id: Optional[uuid.UUID] = None
    organization_id: Optional[uuid.UUID] = None
    case_id: Optional[uuid.UUID] = None
    action: str
    resource_type: str
    resource_id: Optional[uuid.UUID] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    pass

class AuditLogInDB(AuditLogBase):
    id: uuid.UUID
    timestamp: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AuditLog(AuditLogInDB):
    pass
