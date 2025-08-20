from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.api.deps import get_current_active_user, get_current_active_super_admin
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLog as AuditLogSchema
import json
from datetime import datetime
import uuid

router = APIRouter()

def serialize_for_json(obj: Any) -> Any:
    """Convert objects to JSON-serializable format."""
    if isinstance(obj, UserRole):
        return obj.value
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, uuid.UUID):
        return str(obj)
    elif hasattr(obj, '__dict__'):
        return {key: serialize_for_json(value) for key, value in obj.__dict__.items() if not key.startswith('_')}
    elif isinstance(obj, dict):
        return {key: serialize_for_json(value) for key, value in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [serialize_for_json(item) for item in obj]
    else:
        return obj

def create_audit_log_entry(
    db: Session,
    user: User,
    action: str,
    resource_type: str,
    resource_id: Optional[uuid.UUID] = None,
    details: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
    case_id: Optional[uuid.UUID] = None
):
    """Create an audit log entry."""
    try:
        # Serialize details to ensure JSON compatibility
        serialized_details = serialize_for_json(details) if details else None
        
        # Extract IP address and user agent from request
        ip_address = "127.0.0.1"
        user_agent = "Unknown"
        
        if request:
            ip_address = (
                request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or
                request.headers.get("X-Real-IP", "") or
                request.client.host if request.client else "127.0.0.1"
            )
            user_agent = request.headers.get("User-Agent", "Unknown")
        
        audit_log = AuditLog(
            user_id=user.id,
            organization_id=user.organization_id,
            case_id=case_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=serialized_details,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        
        return audit_log
        
    except Exception as e:
        db.rollback()
        print(f"Error creating audit log entry: {str(e)}")
        return None

@router.get("/", response_model=List[AuditLogSchema])
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    resource_type: Optional[str] = None,
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get audit logs (Super Admin sees all, Org Admin sees organization logs)"""
    query = db.query(AuditLog)
    
    if current_user.role == UserRole.SUPER_ADMIN:
        pass
    elif current_user.role == UserRole.ORG_ADMIN:
        if current_user.organization_id is None:
            raise HTTPException(status_code=400, detail="Organization Admin must belong to an organization.")
        query = query.filter(AuditLog.organization_id == current_user.organization_id)
    else:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions to view audit logs."
        )
    
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if action:
        query = query.filter(AuditLog.action == action)
    
    query = query.order_by(AuditLog.timestamp.desc())
    audit_logs = query.offset(skip).limit(limit).all()
    return audit_logs

@router.get("/stats")
def get_audit_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_super_admin)
):
    """Get audit log statistics (Super Admin only)"""
    from sqlalchemy import func
    
    total_logs = db.query(AuditLog).count()
    
    action_stats = db.query(
        AuditLog.action,
        func.count(AuditLog.id).label('count')
    ).group_by(AuditLog.action).all()
    
    resource_stats = db.query(
        AuditLog.resource_type,
        func.count(AuditLog.id).label('count')
    ).group_by(AuditLog.resource_type).all()
    
    from datetime import datetime, timedelta
    yesterday = datetime.utcnow() - timedelta(days=1)
    recent_activity = db.query(AuditLog).filter(
        AuditLog.timestamp >= yesterday
    ).count()
    
    return {
        "total_logs": total_logs,
        "recent_activity_24h": recent_activity,
        "action_breakdown": {stat.action: stat.count for stat in action_stats},
        "resource_breakdown": {stat.resource_type: stat.count for stat in resource_stats}
    }
