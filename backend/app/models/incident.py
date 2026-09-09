from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Incident(Base):
    """
    Wraps a SecurityEvent with analyst investigation state.
    One incident per security event in this MVP (kept 1:1 for simplicity;
    can be relaxed to group multiple events later).
    """
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    security_event_id = Column(Integer, ForeignKey("security_events.id"), unique=True, nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)

    opened_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    security_event = relationship("SecurityEvent", back_populates="incident")
    notes = relationship("IncidentNote", back_populates="incident", cascade="all, delete-orphan")


class IncidentNote(Base):
    __tablename__ = "incident_notes"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    incident = relationship("Incident", back_populates="notes")
