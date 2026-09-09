from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index, Float
from sqlalchemy.orm import relationship

from app.database import Base


class RequestLog(Base):
    """
    Structured record of every meaningful inbound request.
    Produced by the logging middleware and fed to the detection engine.
    """
    __tablename__ = "request_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    source_ip = Column(String(64), nullable=False, index=True)
    method = Column(String(10), nullable=False)
    endpoint = Column(String(255), nullable=False, index=True)
    status_code = Column(Integer, nullable=False, index=True)
    response_time = Column(Float, nullable=False)  # milliseconds
    user_agent = Column(String(512), nullable=True)
    request_type = Column(String(50), nullable=True, index=True)  # e.g. "authentication", "search", "api"

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="request_logs")

    __table_args__ = (
        Index("ix_requestlog_ip_ts", "source_ip", "timestamp"),
        Index("ix_requestlog_user_ts", "user_id", "timestamp"),
        Index("ix_requestlog_endpoint_ts", "endpoint", "timestamp"),
    )
