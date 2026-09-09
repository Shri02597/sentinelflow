import enum
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Index, Float, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Severity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class EventStatus(str, enum.Enum):
    NEW = "NEW"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    FALSE_POSITIVE = "FALSE_POSITIVE"


class AttackType(str, enum.Enum):
    BRUTE_FORCE = "BRUTE_FORCE"
    SUSPICIOUS_INPUT = "SUSPICIOUS_INPUT"
    ABNORMAL_RATE = "ABNORMAL_RATE"
    SUSPICIOUS_ENDPOINT = "SUSPICIOUS_ENDPOINT"
    BEHAVIORAL_ANOMALY = "BEHAVIORAL_ANOMALY"


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    event_type = Column(String(50), nullable=False)  # e.g. "authentication", "traffic", "input"
    attack_type = Column(Enum(AttackType), nullable=False, index=True)
    severity = Column(Enum(Severity), nullable=False, index=True)
    risk_score = Column(Integer, nullable=False, default=0)
    confidence = Column(Float, nullable=False, default=0.8)  # 0.0 - 1.0

    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    source_ip = Column(String(64), nullable=False, index=True)
    endpoint = Column(String(255), nullable=True)
    request_id = Column(Integer, ForeignKey("request_logs.id"), nullable=True)

    description = Column(Text, nullable=False)  # human-readable "why this fired"
    status = Column(Enum(EventStatus), default=EventStatus.NEW, nullable=False, index=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="security_events")
    incident = relationship("Incident", back_populates="security_event", uselist=False)

    __table_args__ = (
        Index("ix_secevent_ip_ts", "source_ip", "timestamp"),
        Index("ix_secevent_type_severity", "attack_type", "severity"),
    )
