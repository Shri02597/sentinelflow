"""
Risk scoring engine.

Design: each detection contributes a weighted delta to a running score
(0-100, capped) for the relevant user_id and/or source_ip. Weights live
in config.py so they can be tuned without touching this logic.
"""
import json
from typing import Optional
from sqlalchemy.orm import Session

from app.config import settings
from app.models.risk_score import RiskScore, RiskLevel
from app.models.security_event import AttackType

ATTACK_WEIGHT_MAP = {
    AttackType.BRUTE_FORCE: settings.RISK_WEIGHT_AUTH_FAILURE,
    AttackType.ABNORMAL_RATE: settings.RISK_WEIGHT_ABNORMAL_RATE,
    AttackType.SUSPICIOUS_INPUT: settings.RISK_WEIGHT_SUSPICIOUS_INPUT,
    AttackType.SUSPICIOUS_ENDPOINT: settings.RISK_WEIGHT_SUSPICIOUS_ENDPOINT,
    AttackType.BEHAVIORAL_ANOMALY: settings.RISK_WEIGHT_BEHAVIORAL_ANOMALY,
}


def _get_or_create_risk_row(db: Session, user_id: Optional[int], source_ip: Optional[str]) -> RiskScore:
    query = db.query(RiskScore)
    row = None
    if user_id is not None:
        row = query.filter(RiskScore.user_id == user_id).first()
    elif source_ip is not None:
        row = query.filter(RiskScore.source_ip == source_ip, RiskScore.user_id.is_(None)).first()

    if row is None:
        row = RiskScore(user_id=user_id, source_ip=source_ip, score=0, level=RiskLevel.LOW, reasons="[]")
        db.add(row)
        db.flush()
    return row


def apply_risk_delta(
    db: Session,
    attack_type: AttackType,
    reason: str,
    user_id: Optional[int] = None,
    source_ip: Optional[str] = None,
    is_repeat: bool = False,
) -> RiskScore:
    """
    Applies the weighted delta for a given detection to the user's (or IP's)
    running risk score, updates the level, and appends a human-readable reason.
    Returns the updated RiskScore row (not yet committed — caller commits).
    """
    row = _get_or_create_risk_row(db, user_id, source_ip)

    delta = ATTACK_WEIGHT_MAP.get(attack_type, 10)
    if is_repeat:
        delta += settings.RISK_WEIGHT_REPEAT_EVENT_BONUS

    row.score = min(row.score + delta, settings.RISK_SCORE_MAX)
    row.level = RiskScore.level_for(row.score)

    try:
        reasons = json.loads(row.reasons) if row.reasons else []
    except (json.JSONDecodeError, TypeError):
        reasons = []
    reasons.append(reason)
    row.reasons = json.dumps(reasons[-20:])  # keep last 20 reasons

    db.add(row)
    return row
