from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from app.config import settings
from app.detectors.base import Detector
from app.models.request_log import RequestLog
from app.models.security_event import AttackType, Severity


class BruteForceDetector(Detector):
    """
    Fires when the same source IP (or same target account, if known)
    racks up N+ failed login attempts (401 on /api/auth/login) within
    a configurable rolling window.
    """
    name = "brute_force"

    def check(self, db: Session, log: RequestLog) -> Optional[dict]:
        if not log.endpoint.endswith("/auth/login") or log.status_code != 401:
            return None

        window_start = datetime.utcnow() - timedelta(seconds=settings.BRUTE_FORCE_WINDOW_SECONDS)

        failed_count = (
            db.query(RequestLog)
            .filter(
                RequestLog.source_ip == log.source_ip,
                RequestLog.endpoint == log.endpoint,
                RequestLog.status_code == 401,
                RequestLog.timestamp >= window_start,
            )
            .count()
        )

        if failed_count < settings.BRUTE_FORCE_MAX_ATTEMPTS:
            return None

        first_attempt = (
            db.query(RequestLog)
            .filter(
                RequestLog.source_ip == log.source_ip,
                RequestLog.endpoint == log.endpoint,
                RequestLog.status_code == 401,
                RequestLog.timestamp >= window_start,
            )
            .order_by(RequestLog.timestamp.asc())
            .first()
        )

        is_repeat = failed_count > settings.BRUTE_FORCE_MAX_ATTEMPTS
        severity = Severity.HIGH if failed_count < settings.BRUTE_FORCE_MAX_ATTEMPTS * 2 else Severity.CRITICAL

        return {
            "attack_type": AttackType.BRUTE_FORCE,
            "severity": severity,
            "event_type": "authentication",
            "description": (
                f"{failed_count} failed login attempts from {log.source_ip} against "
                f"{log.endpoint} within {settings.BRUTE_FORCE_WINDOW_SECONDS}s "
                f"(first at {first_attempt.timestamp.isoformat() if first_attempt else 'unknown'})."
            ),
            "confidence": 0.9,
            "is_repeat": is_repeat,
        }
