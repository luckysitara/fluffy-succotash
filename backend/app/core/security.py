from datetime import datetime, timedelta
from typing import Any, Optional, Union
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings
from app.models.user import UserRole  # Import UserRole
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(
    subject: str,
    expires_delta: timedelta,
    role: UserRole,  # Add role
    organization_id: Optional[Union[str, uuid.UUID]] = None,  # Accept both string and UUID types
    password_changed_at: datetime = datetime.utcnow()  # NEW PARAMETER
) -> str:
    to_encode = {
        "sub": subject,
        "role": role.value,
        "password_changed_at": password_changed_at.isoformat()  # NEW: Include timestamp
    }
    if organization_id is not None:
        to_encode["organization_id"] = str(organization_id)
    
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
