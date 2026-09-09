"""
Runs every registered detector against a freshly-logged request.
On a hit: creates a SecurityEvent, updates the risk score, and schedules
a WebSocket broadcast to connected dashboards.

Adding a new detector: implement Detector in app/detectors/, add an
instance to DETECTORS below. Nothing else needs to change.
"""
from typing import Optional
from sqlalchemy.orm import Session

from app.detectors.brute_force import BruteForceDetector
from app.detectors.suspicious_input import SuspiciousInputDetector
from app.detectors.abnormal_rate import AbnormalRateDetector
from app.detectors.suspicious_endpoint import SuspiciousEndpointDetector
from app.detectors.behavioral_anomaly import BehavioralAnomalyDetector

from app.models.request_log import RequestLog
from app.models.security_event import SecurityEvent
from app.services.risk_scoring import apply_risk_delta
from app.schemas.security import SecurityEventOut
from app.websocket.manager import broadcast_security_event, broadcast_risk_update

DETECTORS = [
    BruteForceDetector(),
    SuspiciousInputDetector(),
    AbnormalRateDetector(),
    SuspiciousEndpointDetector(),
    BehavioralAnomalyDetector(),
]


async def run_detection(db: Session, log: RequestLog) -> None:
    """
    Called by the logging middleware after each RequestLog is persisted.
    Runs all detectors, persists any resulting SecurityEvent + RiskScore
    updates in one transaction, then broadcasts over WebSocket.
    """
    for detector in DETECTORS:
        result: Optional[dict] = detector.check(db, log)
        if result is None:
            continue

        event = SecurityEvent(
            event_type=result["event_type"],
            attack_type=result["attack_type"],
            severity=result["severity"],
            risk_score=0,  # filled in after risk scoring below
            confidence=result.get("confidence", 0.7),
            user_id=log.user_id,
            source_ip=log.source_ip,
            endpoint=log.endpoint,
            request_id=log.id,
            description=result["description"],
        )
        db.add(event)
        db.flush()  # get event.id

        risk_row = apply_risk_delta(
            db,
            attack_type=result["attack_type"],
            reason=result["description"],
            user_id=log.user_id,
            source_ip=log.source_ip if log.user_id is None else None,
            is_repeat=result.get("is_repeat", False),
        )
        event.risk_score = risk_row.score

        db.commit()
        db.refresh(event)

        event_out = SecurityEventOut.model_validate(event).model_dump()
        await broadcast_security_event(event_out)
        await broadcast_risk_update(
            {
                "user_id": risk_row.user_id,
                "source_ip": risk_row.source_ip,
                "score": risk_row.score,
                "level": risk_row.level,
            }
        )
