from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.user import UserRole


class AdminUserOut(BaseModel):
    id: int
    email: str
    username: str
    role: UserRole
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime]

    class Config:
        from_attributes = True


class RoleUpdate(BaseModel):
    role: UserRole


class ActiveStatusUpdate(BaseModel):
    is_active: bool


class DetectionSettingsOut(BaseModel):
    brute_force_max_attempts: int
    brute_force_window_seconds: int
    abnormal_rate_suspicious_min: int
    abnormal_rate_window_seconds: int
    suspicious_endpoint_threshold: int
    suspicious_endpoint_window_seconds: int
    behavioral_deviation_multiplier: float


class DetectionSettingsUpdate(BaseModel):
    """All fields optional — only supplied fields are changed."""
    brute_force_max_attempts: Optional[int] = None
    brute_force_window_seconds: Optional[int] = None
    abnormal_rate_suspicious_min: Optional[int] = None
    abnormal_rate_window_seconds: Optional[int] = None
    suspicious_endpoint_threshold: Optional[int] = None
    suspicious_endpoint_window_seconds: Optional[int] = None
    behavioral_deviation_multiplier: Optional[float] = None
