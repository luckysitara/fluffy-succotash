from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid
from app.models.user import UserRole

class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool = True
    organization_id: Optional[uuid.UUID] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    organization_id: Optional[uuid.UUID] = None

class UserInDB(UserBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class User(UserInDB):
    pass

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None
    organization_id: Optional[uuid.UUID] = None
