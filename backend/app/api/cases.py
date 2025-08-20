from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.api.deps import (
    get_current_active_user,
    get_current_active_super_admin,
    get_current_active_org_admin,
    get_current_active_staff_user,
    get_current_active_individual_user,
)
from app.api.audit_log import create_audit_log_entry
from app.models.case import Case, CaseStatus, CasePriority
from app.models.user import User, UserRole
from app.models.case_assignment import CaseAssignment
from app.models.evidence import Evidence
from app.schemas.case import Case as CaseSchema, CaseCreate, CaseUpdate
import uuid

router = APIRouter()

@router.post("/", response_model=CaseSchema, status_code=status.HTTP_201_CREATED)
def create_case(
    case_in: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Create a new case (all roles except Super Admin must be associated with an organization)"""
    organization_id_to_assign = None

    if current_user.role == UserRole.SUPER_ADMIN:
        if case_in.organization_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Super Admin must specify an organization_id when creating a case.")
        org = db.query(Organization).filter(Organization.id == case_in.organization_id).first()
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
        organization_id_to_assign = case_in.organization_id
    elif current_user.role == UserRole.INDIVIDUAL_USER:
        organization_id_to_assign = None
    else:
        if current_user.organization_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User must belong to an organization to create a case.")
        if case_in.organization_id is not None and case_in.organization_id != current_user.organization_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create cases for other organizations.")
        organization_id_to_assign = current_user.organization_id

    case = Case(
        **case_in.model_dump(exclude_unset=True, exclude={"organization_id"}),
        created_by=current_user.id,
        organization_id=organization_id_to_assign
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    create_audit_log_entry(
        db, current_user, "CREATE", "Case", case.id, {"title": case.title}, request
    )
    return case

@router.get("/", response_model=List[CaseSchema])
def read_cases(
    skip: int = 0,
    limit: int = 100,
    case_status: Optional[CaseStatus] = None,  # renamed from status to avoid conflict
    priority: Optional[CasePriority] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Retrieve a list of cases (filtered by organization for non-Super Admins)"""
    from sqlalchemy.orm import joinedload
    from sqlalchemy import or_
    query = db.query(Case).options(
        joinedload(Case.created_by_user),
        joinedload(Case.assigned_to_user)
    )

    if current_user.role == UserRole.SUPER_ADMIN:
        # Super admin can see all cases
        pass
    elif current_user.role == UserRole.ORG_ADMIN:
        if current_user.organization_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User must belong to an organization to view cases.")
        query = query.filter(Case.organization_id == current_user.organization_id)
    elif current_user.role == UserRole.STAFF_USER:
        if current_user.organization_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User must belong to an organization to view cases.")
        
        # Get case IDs where user is assigned via the assignments table
        assigned_case_ids = db.query(CaseAssignment.case_id).filter(
            CaseAssignment.user_id == current_user.id
        ).subquery()
        
        query = query.filter(
            or_(
                Case.created_by == current_user.id,
                Case.assigned_to == current_user.id,  # Legacy single assignment
                Case.id.in_(assigned_case_ids)  # New multiple assignments
            )
        )
    elif current_user.role == UserRole.INDIVIDUAL_USER:
        assigned_case_ids = db.query(CaseAssignment.case_id).filter(
            CaseAssignment.user_id == current_user.id
        ).subquery()
        
        query = query.filter(
            or_(
                Case.created_by == current_user.id,
                Case.assigned_to == current_user.id,  # Legacy single assignment
                Case.id.in_(assigned_case_ids)  # New multiple assignments
            )
        )

    if case_status:  # updated variable name
        query = query.filter(Case.status == case_status)
    if priority:
        query = query.filter(Case.priority == priority)

    cases = query.offset(skip).limit(limit).all()
    
    create_audit_log_entry(
        db, current_user, "READ", "Case", details={"action": "list_cases", "filters": {"status": case_status, "priority": priority}}, request=request
    )
    return cases

@router.get("/{case_id}", response_model=CaseSchema)
def read_case(
    case_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Retrieve a single case by ID (filtered by organization for non-Super Admins)"""
    from sqlalchemy.orm import joinedload
    case = db.query(Case).options(
        joinedload(Case.created_by_user),
        joinedload(Case.assigned_to_user)
    ).filter(Case.id == case_id).first()
    
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    
    if current_user.role == UserRole.SUPER_ADMIN:
        pass  # Super admin can access any case
    elif current_user.role == UserRole.ORG_ADMIN:
        if case.organization_id != current_user.organization_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this case.")
    elif current_user.role == UserRole.STAFF_USER:
        is_assigned_via_table = db.query(CaseAssignment).filter(
            CaseAssignment.case_id == case_id,
            CaseAssignment.user_id == current_user.id
        ).first() is not None
        
        if (case.created_by != current_user.id and 
            case.assigned_to != current_user.id and 
            not is_assigned_via_table):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this case.")
    elif current_user.role == UserRole.INDIVIDUAL_USER:
        is_assigned_via_table = db.query(CaseAssignment).filter(
            CaseAssignment.case_id == case_id,
            CaseAssignment.user_id == current_user.id
        ).first() is not None
        
        if (case.created_by != current_user.id and 
            case.assigned_to != current_user.id and 
            not is_assigned_via_table):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this case.")
    
    create_audit_log_entry(
        db, current_user, "READ", "Case", case.id, {"title": case.title}, request
    )
    return case

@router.put("/{case_id}", response_model=CaseSchema)
def update_case(
    case_id: uuid.UUID,
    case_update: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Update an existing case (filtered by organization for non-Super Admins)"""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    
    if current_user.role == UserRole.SUPER_ADMIN:
        pass  # Super admin can update any case
    elif current_user.role == UserRole.ORG_ADMIN:
        if case.organization_id != current_user.organization_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this case.")
    elif current_user.role == UserRole.STAFF_USER:
        is_assigned_via_table = db.query(CaseAssignment).filter(
            CaseAssignment.case_id == case_id,
            CaseAssignment.user_id == current_user.id
        ).first() is not None
        
        if (case.created_by != current_user.id and 
            case.assigned_to != current_user.id and 
            not is_assigned_via_table):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this case.")
    elif current_user.role == UserRole.INDIVIDUAL_USER:
        is_assigned_via_table = db.query(CaseAssignment).filter(
            CaseAssignment.case_id == case_id,
            CaseAssignment.user_id == current_user.id
        ).first() is not None
        
        if (case.created_by != current_user.id and 
            case.assigned_to != current_user.id and 
            not is_assigned_via_table):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Individual users can only update their own cases or cases assigned to them.")
    
    update_data = case_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(case, field, value)
    
    db.commit()
    db.refresh(case)

    create_audit_log_entry(
        db, current_user, "UPDATE", "Case", case.id, {"updated_fields": update_data}, request
    )
    return case

@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_case(
    case_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Delete a case (Super Admin, Org Admin, or case creator if Individual User)"""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    
    # Authorization - only creators and admins can delete, not assigned users
    if current_user.role == UserRole.SUPER_ADMIN:
        pass # Super Admin can delete any case
    elif current_user.role == UserRole.ORG_ADMIN:
        if case.organization_id != current_user.organization_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this case.")
    elif current_user.role == UserRole.INDIVIDUAL_USER and case.created_by == current_user.id:
        pass # Individual user can delete their own cases
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this case.")
    
    # This prevents the foreign key constraint violation
    evidence_records = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    for evidence in evidence_records:
        db.delete(evidence)
    
    case_assignments = db.query(CaseAssignment).filter(CaseAssignment.case_id == case_id).all()
    for assignment in case_assignments:
        db.delete(assignment)
    
    # Now delete the case itself
    db.delete(case)
    db.commit()

    create_audit_log_entry(
        db, current_user, "DELETE", "Case", case_id, {"title": case.title}, request
    )
    return {"message": "Case deleted successfully"}

@router.get("/assignment/users", response_model=List[dict])
def get_assignable_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get list of users that can be assigned to cases"""
    from app.models.user import User
    
    if current_user.role == UserRole.SUPER_ADMIN:
        # Super admin can assign to any active user
        users = db.query(User).filter(User.is_active == True).all()
    elif current_user.role in [UserRole.ORG_ADMIN, UserRole.STAFF_USER]:
        # Org admin and staff can assign to users in their organization
        if current_user.organization_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User must belong to an organization.")
        users = db.query(User).filter(
            User.organization_id == current_user.organization_id,
            User.is_active == True
        ).all()
    else:
        # Individual users cannot assign cases to others
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to assign cases.")
    
    return [
        {
            "id": str(user.id),
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role.value
        }
        for user in users
    ]

@router.post("/{case_id}/assignments", status_code=status.HTTP_201_CREATED)
def assign_users_to_case(
    case_id: uuid.UUID,
    user_ids: List[uuid.UUID],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Assign multiple users to a case"""
    # Check if case exists and user has permission
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    
    # Authorization check
    if current_user.role == UserRole.SUPER_ADMIN:
        pass  # Super admin can assign to any case
    elif current_user.role == UserRole.ORG_ADMIN:
        if case.organization_id != current_user.organization_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to assign users to this case.")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to assign users to cases.")
    
    # Validate all user IDs exist and are in the same organization (if applicable)
    users = db.query(User).filter(User.id.in_(user_ids), User.is_active == True).all()
    if len(users) != len(user_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more user IDs are invalid or inactive.")
    
    # For organization cases, ensure all users belong to the same organization
    if case.organization_id:
        invalid_users = [user for user in users if user.organization_id != case.organization_id]
        if invalid_users:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="All assigned users must belong to the case's organization.")
    
    # Create assignments (ignore duplicates due to unique constraint)
    assignments_created = []
    for user_id in user_ids:
        existing_assignment = db.query(CaseAssignment).filter(
            CaseAssignment.case_id == case_id,
            CaseAssignment.user_id == user_id
        ).first()
        
        if not existing_assignment:
            assignment = CaseAssignment(
                case_id=case_id,
                user_id=user_id,
                assigned_by=current_user.id
            )
            db.add(assignment)
            assignments_created.append(str(user_id))
    
    db.commit()
    
    create_audit_log_entry(
        db, current_user, "ASSIGN", "Case", case_id, 
        {"assigned_users": assignments_created}, request
    )
    
    return {"message": f"Successfully assigned {len(assignments_created)} users to case", "assigned_users": assignments_created}

@router.delete("/{case_id}/assignments/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_user_from_case(
    case_id: uuid.UUID,
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Remove a user assignment from a case"""
    # Check if case exists and user has permission
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    
    # Authorization check
    if current_user.role == UserRole.SUPER_ADMIN:
        pass  # Super admin can remove assignments from any case
    elif current_user.role == UserRole.ORG_ADMIN:
        if case.organization_id != current_user.organization_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify assignments for this case.")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify case assignments.")
    
    # Find and remove the assignment
    assignment = db.query(CaseAssignment).filter(
        CaseAssignment.case_id == case_id,
        CaseAssignment.user_id == user_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    
    db.delete(assignment)
    db.commit()
    
    create_audit_log_entry(
        db, current_user, "UNASSIGN", "Case", case_id, 
        {"unassigned_user": str(user_id)}, request
    )
    
    return {"message": "User assignment removed successfully"}

@router.get("/{case_id}/assignments", response_model=List[dict])
def get_case_assignments(
    case_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Get all users assigned to a case"""
    # Check if case exists and user has permission to view it
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    
    # Use the same authorization logic as read_case
    if current_user.role == UserRole.SUPER_ADMIN:
        pass  # Super admin can view any case assignments
    elif current_user.role == UserRole.ORG_ADMIN:
        if case.organization_id != current_user.organization_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this case.")
    elif current_user.role == UserRole.STAFF_USER:
        is_assigned_via_table = db.query(CaseAssignment).filter(
            CaseAssignment.case_id == case_id,
            CaseAssignment.user_id == current_user.id
        ).first() is not None
        
        if (case.created_by != current_user.id and 
            case.assigned_to != current_user.id and 
            not is_assigned_via_table):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this case.")
    elif current_user.role == UserRole.INDIVIDUAL_USER:
        is_assigned_via_table = db.query(CaseAssignment).filter(
            CaseAssignment.case_id == case_id,
            CaseAssignment.user_id == current_user.id
        ).first() is not None
        
        if (case.created_by != current_user.id and 
            case.assigned_to != current_user.id and 
            not is_assigned_via_table):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this case.")
    
    # Get all assignments with user details
    from sqlalchemy.orm import joinedload
    assignments = db.query(CaseAssignment).options(
        joinedload(CaseAssignment.user),
        joinedload(CaseAssignment.assigned_by_user)
    ).filter(CaseAssignment.case_id == case_id).all()
    
    result = []
    for assignment in assignments:
        result.append({
            "assignment_id": str(assignment.id),
            "user": {
                "id": str(assignment.user.id),
                "username": assignment.user.username,
                "full_name": assignment.user.full_name,
                "role": assignment.user.role.value
            },
            "assigned_by": {
                "id": str(assignment.assigned_by_user.id),
                "username": assignment.assigned_by_user.username,
                "full_name": assignment.assigned_by_user.full_name
            } if assignment.assigned_by_user else None,
            "assigned_at": assignment.assigned_at.isoformat()
        })
    
    # Also include legacy single assignment if it exists
    if case.assigned_to_user:
        result.append({
            "assignment_id": "legacy",
            "user": {
                "id": str(case.assigned_to_user.id),
                "username": case.assigned_to_user.username,
                "full_name": case.assigned_to_user.full_name,
                "role": case.assigned_to_user.role.value
            },
            "assigned_by": None,
            "assigned_at": case.created_at.isoformat(),
            "is_legacy": True
        })
    
    create_audit_log_entry(
        db, current_user, "READ", "CaseAssignment", case_id, 
        {"action": "list_assignments"}, request
    )
    
    return result
