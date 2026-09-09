from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.request_log import RequestLog
from app.models.security_event import SecurityEvent, AttackType, Severity, EventStatus
from app.models.incident import Incident, IncidentNote
from app.models.risk_score import RiskScore
from app.schemas.security import (
    SecurityEventOut, SecurityEventUpdate, IncidentNoteIn, IncidentNoteOut,
    SecurityStatsOut, TrafficPointOut, RiskyUserOut, RequestLogOut,
)
from app.security.deps import require_roles

router = APIRouter(prefix="/api/security", tags=["security"])
analyst_or_admin = require_roles(UserRole.ANALYST, UserRole.ADMIN)

SORTABLE_FIELDS = {
    "timestamp": SecurityEvent.timestamp,
    "risk_score": SecurityEvent.risk_score,
    "severity": SecurityEvent.severity,
}


@router.get("/events", response_model=List[SecurityEventOut])
def list_events(
    attack_type: Optional[AttackType] = None,
    severity: Optional[Severity] = None,
    status_: Optional[EventStatus] = Query(None, alias="status"),
    user_id: Optional[int] = None,
    source_ip: Optional[str] = None,
    endpoint: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    sort_by: str = "timestamp",
    sort_dir: str = "desc",
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(analyst_or_admin),
):
    query = db.query(SecurityEvent)
    if attack_type:
        query = query.filter(SecurityEvent.attack_type == attack_type)
    if severity:
        query = query.filter(SecurityEvent.severity == severity)
    if status_:
        query = query.filter(SecurityEvent.status == status_)
    if user_id:
        query = query.filter(SecurityEvent.user_id == user_id)
    if source_ip:
        query = query.filter(SecurityEvent.source_ip == source_ip)
    if endpoint:
        query = query.filter(SecurityEvent.endpoint.ilike(f"%{endpoint}%"))
    if start:
        query = query.filter(SecurityEvent.timestamp >= start)
    if end:
        query = query.filter(SecurityEvent.timestamp <= end)

    sort_col = SORTABLE_FIELDS.get(sort_by, SecurityEvent.timestamp)
    order = sort_col.asc() if sort_dir == "asc" else sort_col.desc()

    return query.order_by(order).offset(offset).limit(limit).all()


@router.get("/events/{event_id}", response_model=SecurityEventOut)
def get_event(event_id: int, db: Session = Depends(get_db), current_user: User = Depends(analyst_or_admin)):
    event = db.query(SecurityEvent).filter(SecurityEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.patch("/events/{event_id}", response_model=SecurityEventOut)
def update_event(
    event_id: int,
    payload: SecurityEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(analyst_or_admin),
):
    event = db.query(SecurityEvent).filter(SecurityEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if payload.status:
        event.status = payload.status
        # Ensure an Incident exists once an analyst starts investigating
        incident = db.query(Incident).filter(Incident.security_event_id == event.id).first()
        if not incident:
            incident = Incident(security_event_id=event.id, assigned_to=current_user.id)
            db.add(incident)
        if payload.status in (EventStatus.RESOLVED, EventStatus.FALSE_POSITIVE):
            incident.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(event)
    return event


@router.get("/events/{event_id}/related-requests", response_model=List[RequestLogOut])
def get_related_requests(event_id: int, db: Session = Depends(get_db), current_user: User = Depends(analyst_or_admin)):
    event = db.query(SecurityEvent).filter(SecurityEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    window_start = event.timestamp - timedelta(minutes=15)
    window_end = event.timestamp + timedelta(minutes=5)
    logs = (
        db.query(RequestLog)
        .filter(
            RequestLog.source_ip == event.source_ip,
            RequestLog.timestamp >= window_start,
            RequestLog.timestamp <= window_end,
        )
        .order_by(RequestLog.timestamp.asc())
        .all()
    )
    return logs


@router.post("/events/{event_id}/notes", response_model=IncidentNoteOut)
def add_incident_note(
    event_id: int,
    payload: IncidentNoteIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(analyst_or_admin),
):
    incident = db.query(Incident).filter(Incident.security_event_id == event_id).first()
    if not incident:
        incident = Incident(security_event_id=event_id, assigned_to=current_user.id)
        db.add(incident)
        db.flush()

    note = IncidentNote(incident_id=incident.id, author_id=current_user.id, note=payload.note)
    db.add(note)
    db.commit()
    db.refresh(note)
    out = IncidentNoteOut.model_validate(note)
    out.author_username = current_user.username
    return out


@router.get("/events/{event_id}/notes", response_model=List[IncidentNoteOut])
def list_incident_notes(event_id: int, db: Session = Depends(get_db), current_user: User = Depends(analyst_or_admin)):
    incident = db.query(Incident).filter(Incident.security_event_id == event_id).first()
    if not incident:
        return []

    rows = (
        db.query(IncidentNote, User.username)
        .join(User, User.id == IncidentNote.author_id)
        .filter(IncidentNote.incident_id == incident.id)
        .order_by(IncidentNote.created_at.asc())
        .all()
    )
    notes = []
    for note, username in rows:
        out = IncidentNoteOut.model_validate(note)
        out.author_username = username
        notes.append(out)
    return notes


@router.get("/stats", response_model=SecurityStatsOut)
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(analyst_or_admin)):
    total_requests = db.query(RequestLog).count()
    active_users = (
        db.query(RequestLog.user_id)
        .filter(RequestLog.user_id.isnot(None), RequestLog.timestamp >= datetime.utcnow() - timedelta(hours=24))
        .distinct()
        .count()
    )
    total_events = db.query(SecurityEvent).count()
    critical = db.query(SecurityEvent).filter(SecurityEvent.severity == Severity.CRITICAL).count()

    by_attack = dict(
        db.query(SecurityEvent.attack_type, func.count(SecurityEvent.id)).group_by(SecurityEvent.attack_type).all()
    )
    by_severity = dict(
        db.query(SecurityEvent.severity, func.count(SecurityEvent.id)).group_by(SecurityEvent.severity).all()
    )

    return SecurityStatsOut(
        total_requests=total_requests,
        active_users=active_users,
        total_security_events=total_events,
        critical_threats=critical,
        events_by_attack_type={k.value: v for k, v in by_attack.items()},
        events_by_severity={k.value: v for k, v in by_severity.items()},
    )


@router.get("/traffic", response_model=List[TrafficPointOut])
def get_traffic(minutes: int = 60, db: Session = Depends(get_db), current_user: User = Depends(analyst_or_admin)):
    window_start = datetime.utcnow() - timedelta(minutes=minutes)
    # SQLite/Postgres-portable minute bucketing done in Python rather than SQL
    # date_trunc, to keep this compatible with both backends for the MVP.
    logs = (
        db.query(RequestLog.timestamp)
        .filter(RequestLog.timestamp >= window_start)
        .order_by(RequestLog.timestamp.asc())
        .all()
    )
    buckets: dict = {}
    for (ts,) in logs:
        bucket = ts.replace(second=0, microsecond=0)
        buckets[bucket] = buckets.get(bucket, 0) + 1

    return [TrafficPointOut(bucket=b, request_count=c) for b, c in sorted(buckets.items())]


@router.get("/risky-users", response_model=List[RiskyUserOut])
def get_risky_users(limit: int = 20, db: Session = Depends(get_db), current_user: User = Depends(analyst_or_admin)):
    rows = db.query(RiskScore).order_by(RiskScore.score.desc()).limit(limit).all()
    result = []
    for row in rows:
        threat_count_q = db.query(SecurityEvent)
        if row.user_id:
            threat_count_q = threat_count_q.filter(SecurityEvent.user_id == row.user_id)
        else:
            threat_count_q = threat_count_q.filter(SecurityEvent.source_ip == row.source_ip)
        threat_count = threat_count_q.count()
        latest = threat_count_q.order_by(SecurityEvent.timestamp.desc()).first()

        result.append(
            RiskyUserOut(
                user_id=row.user_id,
                source_ip=row.source_ip,
                risk_score=row.score,
                risk_level=row.level,
                threat_count=threat_count,
                latest_event=latest.timestamp if latest else None,
            )
        )
    return result
