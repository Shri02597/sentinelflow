import enum
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class UserRole(str, enum.Enum):
    USER = "USER"
    ANALYST = "ANALYST"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)  # bcrypt hash only — never plaintext
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)

    request_logs = relationship("RequestLog", back_populates="user")
    security_events = relationship("SecurityEvent", back_populates="user")
    risk_score = relationship("RiskScore", back_populates="user", uselist=False)
    cart_items = relationship("CartItem", back_populates="user", cascade="all, delete-orphan")
