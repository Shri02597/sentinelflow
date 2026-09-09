from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from app.config import settings
from app.detectors.base import Detector
from app.models.request_log import RequestLog
from app.models.security_event import AttackType, Severity


class BehavioralAnomalyDetector(Detector):
    """
    Lightweight baseline comparison (no ML): compares the requester's
    request rate in the last minute against their own rolling average
    over the baseline window. A large deviation (configurable multiplier)
    triggers an anomaly, independent of any fixed global threshold.
    """
    name = "behavioral_anomaly"

    def check(self, db: Session, log: RequestLog) -> Optional[dict]:
        if log.user_id is None:
            return None  # baseline is per-authenticated-user for now

        now = datetime.utcnow()
        recent_start = now - timedelta(minutes=1)
        baseline_start = now - timedelta(minutes=settings.BEHAVIORAL_BASELINE_WINDOW_MINUTES)

        recent_count = (
            db.query(RequestLog)
            .filter(RequestLog.user_id == log.user_id, RequestLog.timestamp >= recent_start)
            .count()
        )

        baseline_total = (
            db.query(RequestLog)
            .filter(
                RequestLog.user_id == log.user_id,
                RequestLog.timestamp >= baseline_start,
                RequestLog.timestamp < recent_start,
            )
            .count()
        )
        baseline_minutes = max(settings.BEHAVIORAL_BASELINE_WINDOW_MINUTES - 1, 1)
        baseline_avg = baseline_total / baseline_minutes

        # Require a minimum baseline and recent activity to avoid noisy false positives
        # for brand-new users with no history yet.
        if baseline_avg < 2 or recent_count < 5:
            return None

        if recent_count < baseline_avg * settings.BEHAVIORAL_DEVIATION_MULTIPLIER:
            return None

        return {
            "attack_type": AttackType.BEHAVIORAL_ANOMALY,
            "severity": Severity.MEDIUM,
            "event_type": "behavioral",
            "description": (
                f"Request rate ({recent_count}/min) is significantly higher than this "
                f"user's recent baseline (~{baseline_avg:.1f}/min)."
            ),
            "confidence": 0.65,
            "is_repeat": False,
        }
