from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from app.config import settings
from app.detectors.base import Detector
from app.models.request_log import RequestLog
from app.models.security_event import AttackType, Severity


class AbnormalRateDetector(Detector):
    """
    Fires when a single source IP exceeds the suspicious requests/minute
    threshold within the configured window. Normal traffic (<= NORMAL_MAX)
    never fires; anything at/above SUSPICIOUS_MIN does.
    """
    name = "abnormal_rate"

    def check(self, db: Session, log: RequestLog) -> Optional[dict]:
        window_start = datetime.utcnow() - timedelta(seconds=settings.ABNORMAL_RATE_WINDOW_SECONDS)

        count = (
            db.query(RequestLog)
            .filter(RequestLog.source_ip == log.source_ip, RequestLog.timestamp >= window_start)
            .count()
        )

        if count < settings.ABNORMAL_RATE_SUSPICIOUS_MIN:
            return None

        severity = Severity.HIGH if count < settings.ABNORMAL_RATE_SUSPICIOUS_MIN * 2 else Severity.CRITICAL

        return {
            "attack_type": AttackType.ABNORMAL_RATE,
            "severity": severity,
            "event_type": "traffic",
            "description": (
                f"{count} requests from {log.source_ip} in the last "
                f"{settings.ABNORMAL_RATE_WINDOW_SECONDS}s — well above the normal "
                f"baseline of {settings.ABNORMAL_RATE_NORMAL_MAX}/min."
            ),
            "confidence": 0.85,
            "is_repeat": count > settings.ABNORMAL_RATE_SUSPICIOUS_MIN * 1.5,
        }
