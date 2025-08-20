from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.api.deps import get_current_active_super_admin, get_current_active_user
from app.api.audit_log import create_audit_log_entry
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.schemas.organization import (
    Organization as OrganizationSchema, 
    OrganizationCreate, 
    OrganizationUpdate,
    OrganizationSimple
)
import uuid

router = APIRouter()

@router.post("/", response_model=OrganizationSchema, status_code=status.HTTP_201_CREATED)
def create_organization(
    org_in: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_super_admin),
    request: Request = None
):
    """Create a new organization (Super Admin only)"""
    db_org = db.query(Organization).filter(Organization.name == org_in.name).first()
    if db_org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization with this name already exists."
        )
    
    organization = Organization(**org_in.model_dump())
    db.add(organization)
    db.commit()
    db.refresh(organization)

    create_audit_log_entry(
        db, current_user, "CREATE", "Organization", organization.id, {"name": organization.name}, request
    )
    return organization

@router.get("/", response_model=List[OrganizationSchema])
def read_organizations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_super_admin),
    request: Request = None
):
    """Retrieve a list of all organizations (Super Admin only)"""
    organizations = db.query(Organization).offset(skip).limit(limit).all()
    
    create_audit_log_entry(
        db, current_user, "READ", "Organization", details={"action": "list_organizations"}, request=request
    )
    return organizations

@router.get("/simple", response_model=List[OrganizationSimple])
def read_organizations_simple(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Get simplified organization list for dropdowns (Super Admin and Org Admin only)"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view organizations."
        )
    
    organizations = db.query(Organization).filter(Organization.is_active == True).all()
    
    create_audit_log_entry(
        db, current_user, "READ", "Organization", details={"action": "list_organizations_simple"}, request=request
    )
    return organizations

@router.get("/{org_id}", response_model=OrganizationSchema)
def read_organization(
    org_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_super_admin),
    request: Request = None
):
    """Retrieve a single organization by ID (Super Admin only)"""
    organization = db.query(Organization).filter(Organization.id == org_id).first()
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
    
    create_audit_log_entry(
        db, current_user, "READ", "Organization", organization.id, {"name": organization.name}, request
    )
    return organization

@router.put("/{org_id}", response_model=OrganizationSchema)
def update_organization(
    org_id: uuid.UUID,
    org_update: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_super_admin),
    request: Request = None
):
    """Update an existing organization (Super Admin only)"""
    organization = db.query(Organization).filter(Organization.id == org_id).first()
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
    
    update_data = org_update.model_dump(exclude_unset=True)
    
    if "is_active" in update_data and update_data["is_active"] == False and organization.is_active == True:
        # Deactivate all users in this organization
        affected_users = db.query(User).filter(User.organization_id == org_id).update({"is_active": False})
        create_audit_log_entry(
            db, current_user, "UPDATE", "User", 
            details={"action": "cascade_deactivate_users", "organization_id": str(org_id), "affected_users_count": affected_users}, 
            request=request
        )
    
    for field, value in update_data.items():
        setattr(organization, field, value)
    
    db.commit()
    db.refresh(organization)

    create_audit_log_entry(
        db, current_user, "UPDATE", "Organization", organization.id, {"updated_fields": update_data}, request
    )
    return organization

@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_organization(
    org_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_super_admin),
    request: Request = None
):
    """Delete an organization and all associated data (Super Admin only)"""
    organization = db.query(Organization).filter(Organization.id == org_id).first()
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
    
    users_to_delete = db.query(User).filter(User.organization_id == org_id).all()
    user_count = len(users_to_delete)
    
    for user in users_to_delete:
        db.delete(user)
    
    # Cases and Evidence will be automatically deleted due to CASCADE foreign key constraints
    
    db.delete(organization)
    db.commit()

    create_audit_log_entry(
        db, current_user, "DELETE", "Organization", org_id, 
        {"name": organization.name, "deleted_users_count": user_count, "cascade_delete": True}, 
        request
    )
    return {"message": "Organization and all associated data deleted successfully"}
