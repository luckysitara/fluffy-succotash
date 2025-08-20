from pydantic import BaseModel, computed_field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid
from app.models.evidence import EvidenceType

class EvidenceBase(BaseModel):
    case_id: uuid.UUID
    type: EvidenceType
    name: str
    description: Optional[str] = None
    file_path: Optional[str] = None
    file_hash: Optional[str] = None
    data_info: Optional[Dict[str, Any]] = None
    tags: Optional[str] = None
    is_verified: Optional[bool] = False
    organization_id: Optional[uuid.UUID] = None

class EvidenceCreate(EvidenceBase):
    pass

class EvidenceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    file_path: Optional[str] = None
    file_hash: Optional[str] = None
    data_info: Optional[Dict[str, Any]] = None
    tags: Optional[str] = None
    is_verified: Optional[bool] = None

class EvidenceInDB(EvidenceBase):
    id: uuid.UUID
    uploaded_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Evidence(EvidenceInDB):
    @computed_field
    @property
    def title(self) -> str:
        """Alias for name field to match frontend expectations"""
        return self.name
    
    @computed_field
    @property
    def file_size(self) -> int:
        """Extract file size from data_info"""
        if self.data_info and "file_size" in self.data_info:
            return self.data_info["file_size"]
        return 0
    
    @computed_field
    @property
    def file_type(self) -> str:
        """Extract file type from data_info"""
        if self.data_info and "file_type" in self.data_info:
            return self.data_info["file_type"]
        return "unknown"
    
    @computed_field
    @property
    def uploaded_by_id(self) -> Optional[str]:
        """Alias for uploaded_by field to match frontend expectations"""
        return str(self.uploaded_by) if self.uploaded_by else None
    
    @computed_field
    @property
    def uploaded_at(self) -> datetime:
        """Alias for created_at field to match frontend expectations"""
        return self.created_at
    
    @computed_field
    @property
    def hash_sha256(self) -> Optional[str]:
        """Alias for file_hash field to match frontend expectations"""
        return self.file_hash
