"""
Response & containment API, plus the top-threat attribution view.

  GET  /api/security/threats/top        which IP is the worst offender, and
                                        what attack is it actually running
  GET  /api/security/response/blocked   currently blocked IPs / accounts
  GET  /api/security/response/actions   append-only audit trail of every action
  POST /api/security/response           raise a WARN or BLOCK manually
  POST /api/security/response/release   undo a block
  GET  /api/security/notifications      warnings addressed to the caller
  POST /api/security/notifications/{id}/read

Every route here except notifications requires ANALYST/ADMIN — the ability to
block an account is strictly more powerful than the ability to read the feed.
"""
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.risk_score import RiskScore, RiskLevel
from app.models.response_action import (
    ResponseAction, BlockedIdentity, Notification, ActionType, TargetType,
)
from app.models.security_event import SecurityEvent
from app.models.user import User, UserRole
from app.schemas.response import (
    ResponseActionIn, ResponseActionOut, BlockedIdentityOut,
    TopThreatOut, NotificationOut,
)
from app.security.deps import get_current_user, require_roles
from app.services.containment import (
    apply_action, is_ip_blocked, target_key_for_ip, target_key_for_user,
)
from app.websocket.manager import broadcast_response_action

router = APIRouter(prefix="/api/security", tags=["security-response"])
analyst_or_admin = require_roles(UserRole.ANALYST, UserRole.ADMIN)

# Upper bound on rows scanned for the top-threat view. The view is computed in
# Python for SQLite/Postgres portability (same approach as /traffic), so it
# needs a ceiling to stay bounded.
TOP_THREAT_SCAN_LIMIT = 5000


# --------------------------------------------------------------------------
# Attribution: the worst offender, and what it's doing
# --------------------------------------------------------------------------
@router.get("/threats/top", response_model=List[TopThreatOut])
def top_threats(
    hours: int = 24,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(analyst_or_admin),
):
    """
    Ranks source IPs by how dangerous they currently are and, crucially, what
    attack they're running — grouped per IP so one row answers both "who" and
    "what", instead of forcing the analyst to join the feed and the request
    timeline by hand.

    Risk is the max of the IP-level score and the scores of any accounts seen
    from that IP, because risk is tracked per-account for authenticated
    traffic and per-IP for anonymous traffic (see services/risk_scoring.py).
    """
    since = datetime.utcnow() - timedelta(hours=hours)
    events = (
        db.query(SecurityEvent)
        .filter(SecurityEvent.timestamp >= since)
        .order_by(SecurityEvent.timestamp.desc())
        .limit(TOP_THREAT_SCAN_LIMIT)
        .all()
    )

    buckets: dict = {}
    for ev in events:
        bucket = buckets.setdefault(
            ev.source_ip,
            {
                "score": 0,
                "level": RiskLevel.LOW,
                "attacks": {},
                "users": [],
                "endpoints": [],
                "count": 0,
                "first_seen": ev.timestamp,
                "last_seen": ev.timestamp,
                "latest_event_id": ev.id,
            },
        )
        bucket["count"] += 1
        bucket["attacks"][ev.attack_type.value] = bucket["attacks"].get(ev.attack_type.value, 0) + 1
        if ev.user_id is not None and ev.user_id not in bucket["users"]:
            bucket["users"].append(ev.user_id)
        if ev.endpoint and ev.endpoint not in bucket["endpoints"]:
            bucket["endpoints"].append(ev.endpoint)
        if ev.timestamp > bucket["last_seen"]:
            bucket["last_seen"] = ev.timestamp
        if ev.timestamp < bucket["first_seen"]:
            bucket["first_seen"] = ev.timestamp

    if not buckets:
        return []

    # Pull every risk row that could apply to these IPs in two queries rather
    # than two per IP.
    ips = list(buckets.keys())
    rows = (
        db.query(RiskScore)
        .filter(
            (RiskScore.source_ip.in_(ips) & RiskScore.user_id.is_(None))
            | (RiskScore.user_id.in_([u for b in buckets.values() for u in b["users"]] or [-1]))
        )
        .all()
    )
    ip_level = {r.source_ip: r for r in rows if r.user_id is None and r.source_ip in buckets}
    user_level = {r.user_id: r for r in rows if r.user_id is not None}

    warned_ips = {
        r.target_key
        for r in db.query(ResponseAction)
        .filter(
            ResponseAction.target_type == TargetType.IP,
            ResponseAction.action == ActionType.WARN,
        )
        .all()
    }

    out: List[TopThreatOut] = []
    for ip, bucket in buckets.items():
        candidates = []
        if ip in ip_level:
            candidates.append(ip_level[ip])
        candidates.extend(user_level[u] for u in bucket["users"] if u in user_level)
        top = max(candidates, key=lambda r: r.score) if candidates else None

        score = top.score if top else 0
        level = top.level if top else RiskScore.level_for(score)
        dominant = max(bucket["attacks"].items(), key=lambda kv: kv[1])[0]

        out.append(
            TopThreatOut(
                source_ip=ip,
                risk_score=score,
                risk_level=level,
                is_blocked=is_ip_blocked(db, ip) is not None,
                is_warned=ip in warned_ips,
                event_count=bucket["count"],
                dominant_attack_type=dominant,
                attacks=bucket["attacks"],
                affected_user_ids=bucket["users"],
                endpoints=bucket["endpoints"][:5],
                first_seen=bucket["first_seen"],
                last_seen=bucket["last_seen"],
                latest_event_id=bucket["latest_event_id"],
            )
        )

    out.sort(key=lambda t: (t.risk_score, t.event_count), reverse=True)
    return out[:limit]


# --------------------------------------------------------------------------
# Containment state
# --------------------------------------------------------------------------
@router.get("/response/blocked", response_model=List[BlockedIdentityOut])
def list_blocked(
    include_released: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(analyst_or_admin),
):
    q = db.query(BlockedIdentity)
    if not include_released:
        q = q.filter(BlockedIdentity.is_active.is_(True))
    return q.order_by(BlockedIdentity.blocked_at.desc()).all()


@router.get("/response/actions", response_model=List[ResponseActionOut])
def list_response_actions(
    limit: int = 100,
    target_key: Optional[str] = None,
    action: Optional[ActionType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(analyst_or_admin),
):
    q = db.query(ResponseAction)
    if target_key:
        q = q.filter(ResponseAction.target_key == target_key)
    if action:
        q = q.filter(ResponseAction.action == action)
    return q.order_by(ResponseAction.id.desc()).limit(min(limit, 500)).all()


@router.post("/response", response_model=ResponseActionOut, status_code=201)
def raise_response(
    payload: ResponseActionIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(analyst_or_admin),
):
    """
    Manual WARN or BLOCK.

    Preferred form is `{event_id, action}` — the target IP, the affected
    account, and a default reason are all derived from the event so an analyst
    can't accidentally block the wrong party by mistyping an IP.
    """
    if payload.action is ActionType.UNBLOCK:
        raise HTTPException(
            status_code=400, detail="Use POST /api/security/response/release to unblock"
        )

    source_ip = payload.source_ip
    user_id = payload.user_id
    event = None
    default_reason = None

    if payload.event_id is not None:
        event = db.query(SecurityEvent).filter(SecurityEvent.id == payload.event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        source_ip = source_ip or event.source_ip
        user_id = user_id if user_id is not None else event.user_id
        default_reason = f"Manual {payload.action.value} by analyst on {event.attack_type.value} event."

    # An event always carries a source IP, so driving the response off an event
    # needs no target_type from the client — the IP is the blockable thing.
    target_type = payload.target_type
    if target_type is None:
        target_type = TargetType.IP if source_ip else TargetType.USER

    if not payload.target_key:
        if target_type is TargetType.IP and source_ip:
            target_key = target_key_for_ip(source_ip)
        elif target_type is TargetType.USER and user_id:
            target_key = target_key_for_user(user_id)
        else:
            raise HTTPException(
                status_code=400,
                detail="Provide event_id, or both target_type and a target (source_ip / user_id)",
            )
    else:
        target_key = payload.target_key
        if target_type is TargetType.IP and not source_ip:
            source_ip = target_key
        elif target_type is TargetType.USER and user_id is None and target_key.startswith("user:"):
            user_id = int(target_key.split(":", 1)[1])

    action = apply_action(
        db,
        target_type=target_type,
        target_key=target_key,
        action=payload.action,
        reason=payload.reason or default_reason or f"Manual {payload.action.value} by analyst.",
        source_event_id=event.id if event is not None else None,
        actor=current_user,
        is_auto=False,
        source_ip=source_ip,
        user_id=user_id,
    )
    db.commit()
    db.refresh(action)

    # Background task rather than a bare coroutine call: these endpoints are
    # sync (so they run in a threadpool with no event loop to await on), and
    # calling the coroutine without awaiting it discarded it silently — which
    # is why containment decisions never reached an open dashboard.
    background_tasks.add_task(broadcast_response_action, _response_action_payload(action))
    return action


@router.post("/response/release", response_model=ResponseActionOut, status_code=201)
def release_target(
    background_tasks: BackgroundTasks,
    target_type: TargetType = Query(...),
    target_key: str = Query(...),
    reason: str = Query("Released by analyst."),
    db: Session = Depends(get_db),
    current_user: User = Depends(analyst_or_admin),
):
    action = apply_action(
        db,
        target_type=target_type,
        target_key=target_key,
        action=ActionType.UNBLOCK,
        reason=reason,
        actor=current_user,
        is_auto=False,
    )
    db.commit()
    db.refresh(action)
    background_tasks.add_task(broadcast_response_action, _response_action_payload(action))
    return action


def _response_action_payload(action: ResponseAction) -> dict:
    return {
        "id": action.id,
        "target_type": action.target_type.value,
        "target_key": action.target_key,
        "action": action.action.value,
        "reason": action.reason,
        "is_auto": action.is_auto,
        "source_event_id": action.source_event_id,
        "created_at": action.created_at.isoformat() if action.created_at else None,
    }


# --------------------------------------------------------------------------
# Notifications — the subject's view of a warning
# --------------------------------------------------------------------------
@router.get("/notifications", response_model=List[NotificationOut])
def my_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Warnings addressed to the signed-in account. Any authenticated role can
    read their own — being warned shouldn't require analyst credentials.
    """
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        q = q.filter(Notification.read_at.is_(None))
    return q.order_by(Notification.id.desc()).limit(50).all()


@router.post("/notifications/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.read_at = datetime.utcnow()
    db.commit()
    db.refresh(notification)
    return notification
