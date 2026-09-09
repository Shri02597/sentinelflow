from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.admin import (
    AdminUserOut, RoleUpdate, ActiveStatusUpdate,
    DetectionSettingsOut, DetectionSettingsUpdate,
)
from app.security.deps import require_roles

router = APIRouter(prefix="/api/admin", tags=["admin"])
admin_only = require_roles(UserRole.ADMIN)


@router.get("/users", response_model=List[AdminUserOut])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(admin_only)):
    return db.query(User).order_by(User.id.asc()).all()


@router.patch("/users/{user_id}/role", response_model=AdminUserOut)
def update_user_role(
    user_id: int,
    payload: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/active", response_model=AdminUserOut)
def update_user_active(
    user_id: int,
    payload: ActiveStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_only),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")
    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user


@router.get("/settings", response_model=DetectionSettingsOut)
def get_detection_settings(current_user: User = Depends(admin_only)):
    return DetectionSettingsOut(
        brute_force_max_attempts=settings.BRUTE_FORCE_MAX_ATTEMPTS,
        brute_force_window_seconds=settings.BRUTE_FORCE_WINDOW_SECONDS,
        abnormal_rate_suspicious_min=settings.ABNORMAL_RATE_SUSPICIOUS_MIN,
        abnormal_rate_window_seconds=settings.ABNORMAL_RATE_WINDOW_SECONDS,
        suspicious_endpoint_threshold=settings.SUSPICIOUS_ENDPOINT_404_THRESHOLD,
        suspicious_endpoint_window_seconds=settings.SUSPICIOUS_ENDPOINT_WINDOW_SECONDS,
        behavioral_deviation_multiplier=settings.BEHAVIORAL_DEVIATION_MULTIPLIER,
    )


@router.patch("/settings", response_model=DetectionSettingsOut)
def update_detection_settings(payload: DetectionSettingsUpdate, current_user: User = Depends(admin_only)):
    """
    Applies immediately (detectors read `settings.<FIELD>` live on every
    check), but is an in-memory override only — it resets to the values in
    .env on the next backend restart. Good enough for demoing configurable
    thresholds; swap for a persisted settings table if this needs to survive
    restarts in production.
    """
    field_map = {
        "brute_force_max_attempts": "BRUTE_FORCE_MAX_ATTEMPTS",
        "brute_force_window_seconds": "BRUTE_FORCE_WINDOW_SECONDS",
        "abnormal_rate_suspicious_min": "ABNORMAL_RATE_SUSPICIOUS_MIN",
        "abnormal_rate_window_seconds": "ABNORMAL_RATE_WINDOW_SECONDS",
        "suspicious_endpoint_threshold": "SUSPICIOUS_ENDPOINT_404_THRESHOLD",
        "suspicious_endpoint_window_seconds": "SUSPICIOUS_ENDPOINT_WINDOW_SECONDS",
        "behavioral_deviation_multiplier": "BEHAVIORAL_DEVIATION_MULTIPLIER",
    }
    for field, settings_attr in field_map.items():
        value = getattr(payload, field)
        if value is not None:
            setattr(settings, settings_attr, value)

    return get_detection_settings(current_user)
