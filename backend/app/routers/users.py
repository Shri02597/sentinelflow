from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.request_log import RequestLog
from app.models.risk_score import RiskScore
from app.schemas.security import RiskScoreOut, RequestLogOut, UserStatsOut
from app.security.deps import get_current_user, require_roles

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me")
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/me/activity", response_model=List[RequestLogOut])
def get_my_activity(limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    A normal user's own activity history (Part 1: Authenticated User > Activity).
    Registered before /{user_id}/activity — "me" never collides with the
    int-typed {user_id} path converter, but kept explicit for clarity.
    """
    return (
        db.query(RequestLog)
        .filter(RequestLog.user_id == current_user.id)
        .order_by(RequestLog.timestamp.desc())
        .limit(limit)
        .all()
    )


@router.get("/{user_id}/risk", response_model=RiskScoreOut)
def get_user_risk(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ANALYST, UserRole.ADMIN)),
):
    risk = db.query(RiskScore).filter(RiskScore.user_id == user_id).first()
    if not risk:
        raise HTTPException(status_code=404, detail="No risk profile recorded for this user yet")
    return risk


@router.get("/{user_id}/activity", response_model=List[RequestLogOut])
def get_user_activity(
    user_id: int,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ANALYST, UserRole.ADMIN)),
):
    logs = (
        db.query(RequestLog)
        .filter(RequestLog.user_id == user_id)
        .order_by(RequestLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    return logs


@router.get("/{user_id}/stats", response_model=UserStatsOut)
def get_user_stats(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ANALYST, UserRole.ADMIN)),
):
    """
    Aggregate activity stats for the User Risk Profile page: failed logins,
    per-endpoint request counts, and overall request rate. Computed over the
    user's full logged history (not just the capped /activity list) so the
    numbers stay accurate regardless of how much history there is.
    """
    logs = db.query(RequestLog).filter(RequestLog.user_id == user_id).all()

    failed_login_count = sum(
        1 for log in logs if log.endpoint.endswith("/auth/login") and log.status_code == 401
    )
    endpoints_accessed: dict = {}
    for log in logs:
        endpoints_accessed[log.endpoint] = endpoints_accessed.get(log.endpoint, 0) + 1

    request_rate_per_min = None
    if logs:
        timestamps = [log.timestamp for log in logs]
        span_minutes = max((max(timestamps) - min(timestamps)).total_seconds() / 60, 1)
        request_rate_per_min = round(len(logs) / span_minutes, 2)

    return UserStatsOut(
        total_requests=len(logs),
        failed_login_count=failed_login_count,
        endpoints_accessed=endpoints_accessed,
        request_rate_per_min=request_rate_per_min,
    )
