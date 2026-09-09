from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from app.models.security_event import AttackType, Severity, EventStatus
from app.models.risk_score import RiskLevel


class SecurityEventOut(BaseModel):
    id: int
    timestamp: datetime
    event_type: str
    attack_type: AttackType
    severity: Severity
    risk_score: int
    confidence: float
    user_id: Optional[int]
    source_ip: str
    endpoint: Optional[str]
    description: str
    status: EventStatus

    class Config:
        from_attributes = True


class SecurityEventUpdate(BaseModel):
    status: Optional[EventStatus] = None


class IncidentNoteIn(BaseModel):
    note: str


class IncidentNoteOut(BaseModel):
    id: int
    author_id: int
    author_username: Optional[str] = None
    note: str
    created_at: datetime

    class Config:
        from_attributes = True


class RiskScoreOut(BaseModel):
    user_id: Optional[int]
    source_ip: Optional[str]
    score: int
    level: RiskLevel
    reasons: Optional[str]
    updated_at: datetime

    class Config:
        from_attributes = True


class SecurityStatsOut(BaseModel):
    total_requests: int
    active_users: int
    total_security_events: int
    critical_threats: int
    events_by_attack_type: dict
    events_by_severity: dict


class TrafficPointOut(BaseModel):
    bucket: datetime
    request_count: int


class RiskyUserOut(BaseModel):
    user_id: Optional[int]
    source_ip: Optional[str]
    risk_score: int
    risk_level: RiskLevel
    threat_count: int
    latest_event: Optional[datetime]


class UserStatsOut(BaseModel):
    total_requests: int
    failed_login_count: int
    endpoints_accessed: dict
    request_rate_per_min: Optional[float] = None


class RequestLogOut(BaseModel):
    id: int
    timestamp: datetime
    user_id: Optional[int]
    source_ip: str
    method: str
    endpoint: str
    status_code: int
    response_time: float
    request_type: Optional[str]

    class Config:
        from_attributes = True
