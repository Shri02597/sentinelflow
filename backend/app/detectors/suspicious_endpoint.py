from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from app.config import settings
from app.detectors.base import Detector
from app.models.request_log import RequestLog
from app.models.security_event import AttackType, Severity


class SuspiciousEndpointDetector(Detector):
    """
    Flags probing/scanning-like behavior:
    - repeated 404s from the same IP
    - repeated 401/403 on protected endpoints from the same IP
    within a rolling window.
    """
    name = "suspicious_endpoint"

    def check(self, db: Session, log: RequestLog) -> Optional[dict]:
        if log.status_code not in (401, 403, 404):
            return None

        window_start = datetime.utcnow() - timedelta(seconds=settings.SUSPICIOUS_ENDPOINT_WINDOW_SECONDS)

        count = (
            db.query(RequestLog)
            .filter(
                RequestLog.source_ip == log.source_ip,
                RequestLog.status_code.in_([401, 403, 404]),
                RequestLog.timestamp >= window_start,
            )
            .count()
        )

        if count < settings.SUSPICIOUS_ENDPOINT_404_THRESHOLD:
            return None

        kind = "unauthorized/forbidden access attempts" if log.status_code in (401, 403) else "not-found probes"

        return {
            "attack_type": AttackType.SUSPICIOUS_ENDPOINT,
            "severity": Severity.MEDIUM if count < settings.SUSPICIOUS_ENDPOINT_404_THRESHOLD * 2 else Severity.HIGH,
            "event_type": "endpoint_access",
            "description": (
                f"{count} {kind} from {log.source_ip} within "
                f"{settings.SUSPICIOUS_ENDPOINT_WINDOW_SECONDS}s — consistent with scanning/probing."
            ),
            "confidence": 0.7,
            "is_repeat": count > settings.SUSPICIOUS_ENDPOINT_404_THRESHOLD * 1.5,
        }
