from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.api.deps import (
    get_current_active_user,
    get_current_active_super_admin,
    get_current_active_org_admin,
)
from app.api.audit_log import create_audit_log_entry
from app.models.user import User, UserRole
from app.models.organization import Organization
from app.schemas.user import User as UserSchema, UserCreate, UserUpdate
from app.schemas.pii import PasswordResetRequest, PasswordResetConfirm, ChangePasswordRequest, AdminPasswordResetRequest
from app.core.security import get_password_hash, verify_password
import secrets
from datetime import datetime, timedelta
import uuid

router = APIRouter()

# In-memory storage for password reset tokens (in production, use Redis or database)
password_reset_tokens = {}

@router.get("/me", response_model=UserSchema)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user"""
    return current_user

@router.get("/", response_model=List[UserSchema])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Get all users (Super Admin) or users within the same organization (Org Admin)"""
    query = db.query(User)
    if current_user.role == UserRole.SUPER_ADMIN:
        users = query.offset(skip).limit(limit).all()
    elif current_user.role == UserRole.ORG_ADMIN:
        if current_user.organization_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Organization Admin must belong to an organization.")
        users = query.filter(User.organization_id == current_user.organization_id).offset(skip).limit(limit).all()
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view all users."
        )
    
    create_audit_log_entry(
        db, current_user, "READ", "User", details={"action": "list_users", "role_filter": current_user.role.value}, request=request
    )
    return users

@router.post("/", response_model=UserSchema)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Create new user (Super Admin can create any user, Org Admin can create users within their org)"""
    
    # Check if user already exists
    db_user = db.query(User).filter(User.username == user_in.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    if user_in.role == UserRole.INDIVIDUAL_USER and user_in.organization_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Individual users cannot be assigned to an organization."
        )
    
    # Determine organization_id based on role and current user permissions
    organization_id_to_assign = user_in.organization_id
    
    # Individual users should never have an organization
    if user_in.role == UserRole.INDIVIDUAL_USER:
        organization_id_to_assign = None
    
    if current_user.role == UserRole.SUPER_ADMIN:
        if user_in.role in [UserRole.STAFF_USER, UserRole.ORG_ADMIN] and organization_id_to_assign is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Staff users and Organization Administrators must be assigned to an organization."
            )
        
        # Validate organization exists if one is provided
        if organization_id_to_assign is not None:
            org = db.query(Organization).filter(Organization.id == organization_id_to_assign).first()
            if not org:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
                
    elif current_user.role == UserRole.ORG_ADMIN:
        if current_user.organization_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Organization Admin must belong to an organization.")
        
        if user_in.organization_id is not None and user_in.organization_id != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization Admin can only create users within their own organization."
            )
        if user_in.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization Admin cannot create Super Admin or other Organization Admin users."
            )
        if user_in.role == UserRole.STAFF_USER:
            organization_id_to_assign = current_user.organization_id
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to create users."
        )
    
    hashed_password = get_password_hash(user_in.password)
    db_user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hashed_password,
        role=user_in.role,
        is_active=user_in.is_active,
        organization_id=organization_id_to_assign,
        password_changed_at=datetime.utcnow()
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    create_audit_log_entry(
        db, current_user, "CREATE", "User", db_user.id, {
            "username": db_user.username,
            "role": db_user.role.value,
            "organization_id": str(db_user.organization_id) if db_user.organization_id else None
        }, request
    )
    return db_user

@router.put("/{user_id}", response_model=UserSchema)
def update_user(
    user_id: uuid.UUID,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Update user (Super Admin can update any user, Org Admin can update users within their org, users can update themselves)"""
    user_to_update = db.query(User).filter(User.id == user_id).first()
    if not user_to_update:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent Super Admin from marking themselves inactive
    if (current_user.id == user_id and 
        current_user.role == UserRole.SUPER_ADMIN and 
        user_update.is_active is False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super Admin cannot mark themselves as inactive. This must be done by another Super Admin."
        )
    
    # Authorization logic
    if current_user.role == UserRole.SUPER_ADMIN:
        pass
    elif current_user.role == UserRole.ORG_ADMIN:
        if current_user.organization_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Organization Admin must belong to an organization.")
        
        if user_to_update.organization_id != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization Admin can only update users within their own organization."
            )
        if user_update.role and (user_update.role == UserRole.SUPER_ADMIN or user_update.role == UserRole.ORG_ADMIN):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization Admin cannot assign Super Admin or Organization Admin roles."
            )
        if user_update.organization_id is not None and user_update.organization_id != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization Admin cannot change organization of users."
            )
    elif current_user.id == user_id:
        if user_update.role is not None or user_update.organization_id is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Users cannot change their own role or organization."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to update this user."
        )
    
    update_data = user_update.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
        user_to_update.password_changed_at = datetime.utcnow()
    
    audit_details = {"updated_fields": {}}
    for field, value in update_data.items():
        setattr(user_to_update, field, value)
        if field == "role" and isinstance(value, UserRole):
            audit_details["updated_fields"][field] = value.value
        elif isinstance(value, uuid.UUID):
            audit_details["updated_fields"][field] = str(value)
        else:
            audit_details["updated_fields"][field] = value
    
    db.commit()
    db.refresh(user_to_update)

    create_audit_log_entry(
        db, current_user, "UPDATE", "User", user_to_update.id, audit_details, request
    )
    return user_to_update

@router.delete("/{user_id}")
def delete_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Delete user (Super Admin can delete any user, Org Admin can delete users within their org)"""
    user_to_delete = db.query(User).filter(User.id == user_id).first()
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")
    
    if current_user.id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own user account.")

    if current_user.role == UserRole.SUPER_ADMIN:
        pass
    elif current_user.role == UserRole.ORG_ADMIN:
        if current_user.organization_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Organization Admin must belong to an organization.")
        
        if user_to_delete.organization_id != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization Admin can only delete users within their own organization."
            )
        if user_to_delete.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization Admin cannot delete Super Admin or other Organization Admin users."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to delete this user."
        )
    
    db.delete(user_to_delete)
    db.commit()

    create_audit_log_entry(
        db, current_user, "DELETE", "User", user_id, {"username": user_to_delete.username}, request
    )
    return {"message": "User deleted successfully"}

@router.post("/change-password")
def change_password(
    password_data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Change current user's password"""
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    current_user.hashed_password = get_password_hash(password_data.new_password)
    current_user.password_changed_at = datetime.utcnow()
    db.commit()
    
    create_audit_log_entry(
        db, current_user, "UPDATE", "User", current_user.id, 
        {"action": "password_change"}, request
    )
    
    return {"message": "Password changed successfully"}

@router.post("/admin/reset-password")
def admin_reset_password(
    reset_data: AdminPasswordResetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Admin reset user password (Super Admin or Org Admin)"""
    if not verify_password(reset_data.admin_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin password verification failed. Please enter your own password correctly."
        )

    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to reset user passwords."
        )
    
    user_to_reset = db.query(User).filter(User.id == reset_data.user_id).first()
    if not user_to_reset:
        raise HTTPException(status_code=404, detail="User not found")
    
    if current_user.role == UserRole.ORG_ADMIN:
        if current_user.organization_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Organization Admin must belong to an organization.")
        
        if user_to_reset.organization_id != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization Admin can only reset passwords for users within their own organization."
            )
        
        if user_to_reset.role in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization Admin cannot reset passwords for Super Admin or other Organization Admin users."
            )
    
    user_to_reset.hashed_password = get_password_hash(reset_data.new_password)
    user_to_reset.password_changed_at = datetime.utcnow()
    db.commit()
    
    create_audit_log_entry(
        db, current_user, "UPDATE", "User", user_to_reset.id,
        {"action": "admin_password_reset", "target_user": user_to_reset.username}, request
    )
    
    return {"message": f"Password reset successfully for user {user_to_reset.username}"}

@router.post("/request-password-reset")
def request_password_reset(
    reset_request: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """Request password reset via email"""
    user = db.query(User).filter(User.email == reset_request.email).first()
    if not user:
        return {"message": "If the email exists, a password reset link has been sent."}
    
    token = secrets.token_urlsafe(32)
    password_reset_tokens[token] = {
        "user_id": user.id,
        "expires": datetime.utcnow() + timedelta(hours=1)
    }
    
    return {
        "message": "If the email exists, a password reset link has been sent.",
        "token": token  # Remove this in production
    }

@router.post("/confirm-password-reset")
def confirm_password_reset(
    reset_confirm: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """Confirm password reset with token"""
    token_data = password_reset_tokens.get(reset_confirm.token)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    if datetime.utcnow() > token_data["expires"]:
        del password_reset_tokens[reset_confirm.token]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )
    
    user = db.query(User).filter(User.id == token_data["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.hashed_password = get_password_hash(reset_confirm.new_password)
    user.password_changed_at = datetime.utcnow()
    db.commit()
    
    del password_reset_tokens[reset_confirm.token]
    
    create_audit_log_entry(
        db, user, "UPDATE", "User", user.id,
        {"action": "password_reset_via_email"}, None
    )
    
    return {"message": "Password reset successfully"}

@router.post("/admin/verify-password")
def verify_admin_password(
    password_data: dict,
    current_user: User = Depends(get_current_active_user)
):
    """Verify admin password for secure operations like user deletion"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to perform admin operations."
        )
    
    admin_password = password_data.get("password")
    if not admin_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required"
        )
    
    if not verify_password(admin_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password verification failed"
        )
    
    return {"message": "Password verified successfully"}
