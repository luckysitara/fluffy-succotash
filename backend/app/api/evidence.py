from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.api.deps import get_current_active_user
from app.api.audit_log import create_audit_log_entry
from app.models.evidence import Evidence, EvidenceType
from app.models.case import Case
from app.models.user import User, UserRole
from app.schemas.evidence import Evidence as EvidenceSchema, EvidenceCreate, EvidenceUpdate
from app.core.config import settings
import os
import hashlib
import shutil
import uuid
import mimetypes
import json
from datetime import datetime

router = APIRouter()

def save_upload_file(upload_file: UploadFile, destination_path: str) -> str:
    try:
        with open(destination_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
        return destination_path
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not save file: {e}")

def calculate_file_hash(file_path: str, hash_algo="sha256") -> str:
    hasher = hashlib.sha256() if hash_algo == "sha256" else hashlib.md5()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    return hasher.hexdigest()

def get_file_size(file_path: str) -> int:
    try:
        return os.path.getsize(file_path)
    except OSError:
        return 0

def determine_evidence_type(file_type: str) -> EvidenceType:
    """Determine evidence type based on file MIME type"""
    if file_type.startswith('image/'):
        return EvidenceType.IMAGE
    elif file_type.startswith('video/'):
        return EvidenceType.VIDEO
    elif file_type.startswith('audio/'):
        return EvidenceType.AUDIO
    elif file_type in ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']:
        return EvidenceType.DOCUMENT
    else:
        return EvidenceType.FILE

@router.post("/upload", response_model=EvidenceSchema, status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    case_id: str = Form(...),
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Upload file evidence for a case"""
    try:
        case_uuid = uuid.UUID(case_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid case ID format.")
    
    case = db.query(Case).filter(Case.id == case_uuid).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    
    if current_user.role == UserRole.SUPER_ADMIN:
        pass  # Super admin can add evidence to any case
    elif current_user.role == UserRole.INDIVIDUAL_USER:
        if case.created_by != current_user.id and case.assigned_to != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to add evidence to this case.")
    else:
        if case.organization_id != current_user.organization_id and case.assigned_to != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to add evidence to this case.")
    
    # Create organization-specific upload directory
    org_upload_dir = os.path.join(settings.UPLOAD_DIRECTORY, str(case.organization_id))
    os.makedirs(org_upload_dir, exist_ok=True)

    # Generate unique filename to prevent conflicts
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_location = os.path.join(org_upload_dir, unique_filename)
    
    file_path = save_upload_file(file, file_location)
    file_hash = calculate_file_hash(file_path)
    file_size = get_file_size(file_path)
    
    # Determine MIME type
    file_type, _ = mimetypes.guess_type(file.filename) if file.filename else (None, None)
    file_type = file_type or "application/octet-stream"
    
    # Determine evidence type based on file type
    evidence_type = determine_evidence_type(file_type)

    evidence = Evidence(
        case_id=case_uuid,
        type=evidence_type,
        name=file.filename or unique_filename,
        description=description,
        file_path=file_path,
        file_hash=file_hash,
        data_info={
            "file_size": file_size,
            "file_type": file_type,
            "original_filename": file.filename
        },
        tags=tags,
        organization_id=case.organization_id,
        uploaded_by=current_user.id
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    create_audit_log_entry(
        db, current_user, "CREATE", "Evidence", evidence.id, 
        {"name": evidence.name, "case_id": str(case_uuid), "type": "file_upload"}, request
    )
    return evidence

@router.post("/", response_model=EvidenceSchema, status_code=status.HTTP_201_CREATED)
async def create_evidence(
    case_id: uuid.UUID,
    type: EvidenceType,
    name: str,
    description: Optional[str] = None,
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Create new evidence for a case (filtered by organization for non-Super Admins)"""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    
    if current_user.role == UserRole.SUPER_ADMIN:
        pass  # Super admin can add evidence to any case
    elif current_user.role == UserRole.INDIVIDUAL_USER:
        if case.created_by != current_user.id and case.assigned_to != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to add evidence to this case.")
    else:
        if case.organization_id != current_user.organization_id and case.assigned_to != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to add evidence to this case.")
    
    file_path = None
    file_hash = None
    data_info = {}
    
    if file:
        # Create organization-specific upload directory
        org_upload_dir = os.path.join(settings.UPLOAD_DIRECTORY, str(case.organization_id))
        os.makedirs(org_upload_dir, exist_ok=True)

        file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_location = os.path.join(org_upload_dir, unique_filename)
        
        file_path = save_upload_file(file, file_location)
        file_hash = calculate_file_hash(file_path)
        file_size = get_file_size(file_path)
        
        file_type, _ = mimetypes.guess_type(file.filename) if file.filename else (None, None)
        file_type = file_type or "application/octet-stream"
        
        data_info = {
            "file_size": file_size,
            "file_type": file_type,
            "original_filename": file.filename
        }

    evidence = Evidence(
        case_id=case_id,
        type=type,
        name=name,
        description=description,
        file_path=file_path,
        file_hash=file_hash,
        data_info=data_info,
        tags=tags,
        organization_id=case.organization_id,
        uploaded_by=current_user.id
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    create_audit_log_entry(
        db, current_user, "CREATE", "Evidence", evidence.id, {"name": evidence.name, "case_id": str(case_id)}, request
    )
    return evidence

@router.post("/intelligence", response_model=EvidenceSchema, status_code=status.HTTP_201_CREATED)
async def create_intelligence_evidence(
    case_id: str = Form(...),
    evidence_type: str = Form(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    intelligence_data: str = Form(...),
    source: str = Form(...),
    tags: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Create evidence from intelligence analysis results"""
    try:
        case_uuid = uuid.UUID(case_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid case ID format.")
    
    case = db.query(Case).filter(Case.id == case_uuid).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    
    if current_user.role == UserRole.SUPER_ADMIN:
        pass  # Super admin can add evidence to any case
    elif current_user.role == UserRole.INDIVIDUAL_USER:
        if case.created_by != current_user.id and case.assigned_to != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to add evidence to this case.")
    else:
        if case.organization_id != current_user.organization_id and case.assigned_to != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to add evidence to this case.")
    
    try:
        if isinstance(intelligence_data, str):
            # Validate that it's valid JSON
            parsed_data = json.loads(intelligence_data)
        else:
            parsed_data = intelligence_data
            intelligence_data = json.dumps(parsed_data)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid intelligence data format - must be valid JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error processing intelligence data: {str(e)}")
    
    # Map evidence type string to enum
    try:
        evidence_type_enum = EvidenceType(evidence_type.upper())
    except ValueError:
        evidence_type_enum = EvidenceType.OTHER

    try:
        evidence = Evidence(
            case_id=case_uuid,
            type=evidence_type_enum,
            name=name,
            description=description,
            data_info={
                "intelligence_data": intelligence_data,  # Raw JSON string for compatibility
                "parsed_data": parsed_data,  # Parsed object for direct access
                "source": source,
                "analysis_type": evidence_type,
                "created_from": "intelligence_analysis",
                "data_size": len(intelligence_data),
                "created_at": datetime.utcnow().isoformat(),
                # Enhanced metadata for better case detail display
                "metadata": {
                    "query": parsed_data.get("query", ""),
                    "findings_count": parsed_data.get("findings_count", 0),
                    "risk_level": parsed_data.get("risk_level", "UNKNOWN"),
                    "confidence_score": parsed_data.get("confidence_score", 0),
                    "platform_validation": parsed_data.get("platform_validation", {}),
                    "validation_results": parsed_data.get("validation_results", {}),
                    "username_analysis": parsed_data.get("username_analysis", {}),
                    "scan_summary": parsed_data.get("scan_summary", "")
                }
            },
            tags=tags,
            organization_id=case.organization_id,
            uploaded_by=current_user.id
        )
        db.add(evidence)
        db.commit()
        db.refresh(evidence)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create evidence: {str(e)}")

    create_audit_log_entry(
        db, current_user, "CREATE", "Evidence", evidence.id, 
        {"name": evidence.name, "case_id": str(case_uuid), "type": "intelligence_analysis"}, request
    )
    return evidence

@router.get("/case/{case_id}", response_model=List[EvidenceSchema])
def read_evidence_for_case(
    case_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Retrieve evidence for a specific case (filtered by organization for non-Super Admins)"""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found.")
    
    if current_user.role != UserRole.SUPER_ADMIN and case.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view evidence for this case.")
    
    evidence = db.query(Evidence).filter(Evidence.case_id == case_id).offset(skip).limit(limit).all()

    create_audit_log_entry(
        db, current_user, "READ", "Evidence", details={"action": "list_evidence_for_case", "case_id": str(case_id)}, request=request
    )
    return evidence

@router.get("/{evidence_id}", response_model=EvidenceSchema)
def read_evidence(
    evidence_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Retrieve a single evidence by ID (filtered by organization for non-Super Admins)"""
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found.")
    
    if current_user.role != UserRole.SUPER_ADMIN and evidence.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this evidence.")
    
    create_audit_log_entry(
        db, current_user, "READ", "Evidence", evidence.id, {"name": evidence.name}, request
    )
    return evidence

@router.put("/{evidence_id}", response_model=EvidenceSchema)
def update_evidence(
    evidence_id: uuid.UUID,
    evidence_update: EvidenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Update existing evidence (filtered by organization for non-Super Admins)"""
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found.")
    
    if current_user.role != UserRole.SUPER_ADMIN and evidence.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this evidence.")
    
    update_data = evidence_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(evidence, field, value)
    
    db.commit()
    db.refresh(evidence)

    create_audit_log_entry(
        db, current_user, "UPDATE", "Evidence", evidence.id, {"updated_fields": update_data}, request
    )
    return evidence

@router.delete("/{evidence_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_evidence(
    evidence_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    """Delete evidence (Super Admin, Org Admin, or evidence uploader if Staff/Individual User)"""
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found.")
    
    # Authorization
    if current_user.role == UserRole.SUPER_ADMIN:
        pass # Super Admin can delete any evidence
    elif current_user.role == UserRole.ORG_ADMIN:
        if evidence.organization_id != current_user.organization_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this evidence.")
    elif current_user.role in [UserRole.STAFF_USER, UserRole.INDIVIDUAL_USER] and evidence.uploaded_by == current_user.id:
        pass # Staff/Individual user can delete their own uploaded evidence
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this evidence.")
    
    # Optionally delete the physical file if it exists
    if evidence.file_path and os.path.exists(evidence.file_path):
        try:
            os.remove(evidence.file_path)
        except OSError as e:
            print(f"Error deleting file {evidence.file_path}: {e}")
    
    db.delete(evidence)
    db.commit()

    create_audit_log_entry(
        db, current_user, "DELETE", "Evidence", evidence_id, {"name": evidence.name}, request
    )
    return {"message": "Evidence deleted successfully"}
