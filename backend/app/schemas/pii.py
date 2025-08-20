from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional
import uuid

class PIIResult(BaseModel):
    type: str
    value: str
    confidence: float
    start: int
    end: int

class UsernameResult(BaseModel):
    username: str
    platforms: Dict[str, str]
    confidence: float
    context: str

class PIIAnalysisResponse(BaseModel):
    results: List[PIIResult]
    summary: Dict[str, int]
    username_findings: Optional[List[UsernameResult]] = None
    risk_level: str

class PIIAnalysisRequest(BaseModel):
    text: str
    include_username_lookup: bool = True

class EmailAnalysisRequest(BaseModel):
    email: str

class UsernameSearchRequest(BaseModel):
    username: str

class PhoneAnalysisRequest(BaseModel):
    phone: str

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class AdminPasswordResetRequest(BaseModel):
    user_id: str  # Changed from int to str to match UUID format
    new_password: str
    admin_password: str # Added this field for admin verification
