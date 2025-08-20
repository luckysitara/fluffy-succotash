from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

class OrganizationBase(BaseModel):
    name: str
    description: Optional[str] = None
    plan: Optional[str] = "free"
    max_users: Optional[int] = 10
    max_cases: Optional[int] = 50
    is_active: Optional[bool] = True

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    plan: Optional[str] = None
    max_users: Optional[int] = None
    max_cases: Optional[int] = None
    is_active: Optional[bool] = None

class OrganizationInDB(OrganizationBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Organization(OrganizationInDB):
    pass

# Simple organization schema for dropdowns
class OrganizationSimple(BaseModel):
    id: uuid.UUID
    name: str
    is_active: bool

    class Config:
        from_attributes = True
