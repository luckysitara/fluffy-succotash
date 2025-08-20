from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database.database import get_db
from app.models.user import User, UserRole
from app.models.organization import Organization
from datetime import datetime
import uuid

security = HTTPBearer()

def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        username: str = payload.get("sub")
        role_str: str = payload.get("role")
        organization_id_str: Optional[str] = payload.get("organization_id")
        token_password_changed_at_str: Optional[str] = payload.get("password_changed_at")

        if username is None or role_str is None or token_password_changed_at_str is None:
            raise credentials_exception
        
        # Convert role string back to UserRole enum
        try:
            role = UserRole(role_str)
        except ValueError:
            raise credentials_exception

        # Convert organization_id string to UUID if present
        organization_id = None
        if organization_id_str:
            try:
                organization_id = uuid.UUID(organization_id_str)
            except ValueError:
                raise credentials_exception

        # Convert token timestamp string to datetime object
        try:
            token_password_changed_at = datetime.fromisoformat(token_password_changed_at_str)
        except ValueError:
            raise credentials_exception

    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    
    # Verify that the role and organization_id in the token match the database
    if user.role != role or user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token mismatch with user data. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password_changed_at timestamp for session invalidation
    if user.password_changed_at and token_password_changed_at:
        user_pw_changed_utc = user.password_changed_at.astimezone(datetime.utcnow().tzinfo)
        token_pw_changed_utc = token_password_changed_at.astimezone(datetime.utcnow().tzinfo)

        if user_pw_changed_utc > token_pw_changed_utc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your password has been changed. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_current_active_super_admin(
    current_user: User = Depends(get_current_active_user),
) -> User:
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required"
        )
    return current_user

def get_current_active_org_admin(
    current_user: User = Depends(get_current_active_user),
) -> User:
    if current_user.role not in [UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization Admin or Super Admin access required"
        )
    return current_user

def get_current_active_staff_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    if current_user.role not in [UserRole.STAFF_USER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff User, Organization Admin or Super Admin access required"
        )
    return current_user

def get_current_active_individual_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    return current_user

def get_current_organization(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Organization:
    if current_user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin cannot access organization-specific resources directly without specifying an organization."
        )
    if current_user.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with an organization."
        )
    
    organization = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not organization or not organization.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found or inactive."
        )
    return organization
