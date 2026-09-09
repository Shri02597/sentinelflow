import enum
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship

from app.database import Base


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RiskScore(Base):
    """
    Current dynamic risk score for a user (and/or IP, tracked via source_ip
    for anonymous/unauthenticated activity).
    """
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True, index=True)
    source_ip = Column(String(64), nullable=True, index=True)

    score = Column(Integer, default=0, nullable=False)
    level = Column(Enum(RiskLevel), default=RiskLevel.LOW, nullable=False)
    reasons = Column(Text, nullable=True)  # JSON-encoded list of contributing reasons

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="risk_score")

    @staticmethod
    def level_for(score: int) -> "RiskLevel":
        if score >= 80:
            return RiskLevel.CRITICAL
        if score >= 60:
            return RiskLevel.HIGH
        if score >= 30:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW
