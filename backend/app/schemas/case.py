from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
from app.models.case import CaseStatus, CasePriority
from app.schemas.user import User

class CaseBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[CaseStatus] = CaseStatus.OPEN
    priority: Optional[CasePriority] = CasePriority.MEDIUM
    tags: Optional[List[str]] = []
    organization_id: Optional[uuid.UUID] = None

class CaseCreate(CaseBase):
    pass

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CaseStatus] = None
    priority: Optional[CasePriority] = None
    assigned_to: Optional[uuid.UUID] = None
    tags: Optional[List[str]] = None

class CaseInDB(CaseBase):
    id: uuid.UUID
    created_by: uuid.UUID
    assigned_to: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Case(CaseInDB):
    created_by_user: Optional[User] = None
    assigned_to_user: Optional[User] = None
    
    class Config:
        from_attributes = True
