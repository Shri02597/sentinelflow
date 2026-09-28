"""
Response & containment models — the "act on it" half of the platform.

SentinelFlow's detection pipeline answers *what* happened and *who* did it.
These tables record what the platform then *did about it*:

  ResponseAction   append-only audit trail of every WARN / BLOCK / UNBLOCK,
                   whether it was raised automatically by the auto-response
                   policy or manually by an analyst.
  BlockedIdentity  current enforcement state, one row per target. Kept
                   separate from the audit trail so the enforcement middleware
                   can answer "is this blocked?" with a single indexed lookup
                   instead of replaying history on every request.
  Notification     the warning itself, delivered to the offending account so
                   it can be surfaced in the shop UI. Blocking is silent;
                   warning is not.
"""
import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Enum, Text, Boolean, Index,
)
from sqlalchemy.orm import relationship

from app.database import Base


class TargetType(str, enum.Enum):
    IP = "IP"
    USER = "USER"


class ActionType(str, enum.Enum):
    WARN = "WARN"
    BLOCK = "BLOCK"
    UNBLOCK = "UNBLOCK"


class ActorRole(str, enum.Enum):
    SYSTEM = "SYSTEM"
    ANALYST = "ANALYST"
    ADMIN = "ADMIN"


class ResponseAction(Base):
    """Append-only record of one containment decision. Never mutated."""

    __tablename__ = "response_actions"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    target_type = Column(Enum(TargetType), nullable=False, index=True)
    target_key = Column(String(64), nullable=False, index=True)  # ip literal, or "user:<id>"
    action = Column(Enum(ActionType), nullable=False, index=True)

    reason = Column(Text, nullable=False)
    is_auto = Column(Boolean, default=False, nullable=False)

    source_event_id = Column(
        Integer, ForeignKey("security_events.id"), nullable=True, index=True
    )
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_role = Column(Enum(ActorRole), default=ActorRole.SYSTEM, nullable=False)

    source_event = relationship("SecurityEvent")


class BlockedIdentity(Base):
    """
    Current enforcement state for a target. `is_active` is the single flag the
    request middleware reads; a UNBLOCK flips it off but keeps the row so the
    history of what was blocked (and why) survives.
    """

    __tablename__ = "blocked_identities"

    id = Column(Integer, primary_key=True, index=True)
    target_type = Column(Enum(TargetType), nullable=False)
    target_key = Column(String(64), nullable=False)

    is_active = Column(Boolean, default=True, nullable=False, index=True)
    reason = Column(Text, nullable=False)

    blocked_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    released_at = Column(DateTime, nullable=True)

    source_event_id = Column(
        Integer, ForeignKey("security_events.id"), nullable=True, index=True
    )
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        Index("ux_blocked_identity", "target_type", "target_key", unique=True),
    )


class Notification(Base):
    """
    A warning shown to the offending account in the shop UI. Created for WARN
    actions, and also for automatic blocks so the account has a visible record
    of why it suddenly can't reach the API.
    """

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    source_ip = Column(String(64), nullable=True, index=True)

    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)

    source_event_id = Column(
        Integer, ForeignKey("security_events.id"), nullable=True, index=True
    )
    read_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_notification_user_ts", "user_id", "created_at"),
    )
