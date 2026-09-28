"""
Schemas for the response/containment API and the top-threat attribution view.
"""
from datetime import datetime
from typing import Optional, List, Dict

from pydantic import BaseModel

from app.models.response_action import ActionType, TargetType, ActorRole
from app.models.risk_score import RiskLevel


class ResponseActionIn(BaseModel):
    """
    Either drive the response off an existing event (recommended — the target
    and reason are derived server-side) or name a target explicitly.
    """
    event_id: Optional[int] = None
    target_type: Optional[TargetType] = None
    target_key: Optional[str] = None
    action: ActionType
    reason: Optional[str] = None
    # Only used when blocking/warning an IP directly with no triggering event.
    source_ip: Optional[str] = None
    user_id: Optional[int] = None


class ResponseActionOut(BaseModel):
    id: int
    created_at: datetime
    target_type: TargetType
    target_key: str
    action: ActionType
    reason: str
    is_auto: bool
    source_event_id: Optional[int]
    actor_id: Optional[int]
    actor_role: ActorRole

    class Config:
        from_attributes = True


class BlockedIdentityOut(BaseModel):
    id: int
    target_type: TargetType
    target_key: str
    is_active: bool
    reason: str
    blocked_at: datetime
    released_at: Optional[datetime]
    source_event_id: Optional[int]

    class Config:
        from_attributes = True


class TopThreatOut(BaseModel):
    """One row of the 'who is the worst offender right now' view."""
    source_ip: str
    risk_score: int
    risk_level: RiskLevel
    is_blocked: bool
    is_warned: bool
    event_count: int
    dominant_attack_type: str
    attacks: Dict[str, int]
    affected_user_ids: List[int]
    endpoints: List[str]
    first_seen: datetime
    last_seen: datetime
    latest_event_id: Optional[int]


class NotificationOut(BaseModel):
    id: int
    created_at: datetime
    user_id: Optional[int]
    source_ip: Optional[str]
    title: str
    message: str
    source_event_id: Optional[int]
    read_at: Optional[datetime]

    class Config:
        from_attributes = True
