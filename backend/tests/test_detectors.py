from datetime import datetime

from app.detectors.brute_force import BruteForceDetector
from app.models.request_log import RequestLog
from app.models.security_event import AttackType


def _make_log(db, ip="1.2.3.4", status=401, endpoint="/api/auth/login"):
    log = RequestLog(
        timestamp=datetime.utcnow(), user_id=None, source_ip=ip, method="POST",
        endpoint=endpoint, status_code=status, response_time=50.0,
        user_agent="pytest", request_type="authentication",
    )
    db.add(log)
    db.flush()
    return log


def test_brute_force_not_triggered_below_threshold(client):
    from app.database import SessionLocal
    db = SessionLocal()
    detector = BruteForceDetector()
    for _ in range(4):
        log = _make_log(db)
    result = detector.check(db, log)
    assert result is None
    db.close()


def test_brute_force_triggered_at_threshold(client):
    from app.database import SessionLocal
    db = SessionLocal()
    detector = BruteForceDetector()
    for _ in range(5):
        log = _make_log(db)
    result = detector.check(db, log)
    assert result is not None
    assert result["attack_type"] == AttackType.BRUTE_FORCE
    db.close()


def test_normal_traffic_does_not_trigger_brute_force(client):
    """A handful of successful logins should never fire the detector."""
    from app.database import SessionLocal
    db = SessionLocal()
    detector = BruteForceDetector()
    log = None
    for _ in range(10):
        log = _make_log(db, status=200)
    result = detector.check(db, log)
    assert result is None
    db.close()
