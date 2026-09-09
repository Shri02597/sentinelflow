from datetime import datetime, timedelta

from app.database import SessionLocal
from app.detectors.suspicious_input import SuspiciousInputDetector
from app.detectors.abnormal_rate import AbnormalRateDetector
from app.detectors.suspicious_endpoint import SuspiciousEndpointDetector
from app.detectors.behavioral_anomaly import BehavioralAnomalyDetector
from app.models.request_log import RequestLog
from app.models.security_event import AttackType
from app.config import settings


def _make_log(db, ip="9.9.9.9", status=200, endpoint="/api/products/search", user_id=None, timestamp=None):
    log = RequestLog(
        timestamp=timestamp or datetime.utcnow(), user_id=user_id, source_ip=ip, method="GET",
        endpoint=endpoint, status_code=status, response_time=20.0,
        user_agent="pytest", request_type="api",
    )
    db.add(log)
    db.flush()
    return log


def test_suspicious_input_detects_sqli_pattern(client):
    db = SessionLocal()
    detector = SuspiciousInputDetector()
    log = _make_log(db)
    log.raw_input = "' OR 1=1 --"
    result = detector.check(db, log)
    assert result is not None
    assert result["attack_type"] == AttackType.SUSPICIOUS_INPUT
    db.close()


def test_suspicious_input_ignores_normal_query(client):
    db = SessionLocal()
    detector = SuspiciousInputDetector()
    log = _make_log(db)
    log.raw_input = "wireless keyboard"
    result = detector.check(db, log)
    assert result is None
    db.close()


def test_abnormal_rate_triggers_above_threshold(client):
    db = SessionLocal()
    detector = AbnormalRateDetector()
    log = None
    for _ in range(settings.ABNORMAL_RATE_SUSPICIOUS_MIN):
        log = _make_log(db)
    result = detector.check(db, log)
    assert result is not None
    assert result["attack_type"] == AttackType.ABNORMAL_RATE
    db.close()


def test_abnormal_rate_normal_traffic_is_fine(client):
    db = SessionLocal()
    detector = AbnormalRateDetector()
    log = None
    for _ in range(5):
        log = _make_log(db)
    result = detector.check(db, log)
    assert result is None
    db.close()


def test_suspicious_endpoint_detects_repeated_404s(client):
    db = SessionLocal()
    detector = SuspiciousEndpointDetector()
    log = None
    for _ in range(settings.SUSPICIOUS_ENDPOINT_404_THRESHOLD):
        log = _make_log(db, status=404, endpoint="/api/admin/secret")
    result = detector.check(db, log)
    assert result is not None
    assert result["attack_type"] == AttackType.SUSPICIOUS_ENDPOINT
    db.close()


def test_behavioral_anomaly_requires_authenticated_user(client):
    db = SessionLocal()
    detector = BehavioralAnomalyDetector()
    log = _make_log(db, user_id=None)
    assert detector.check(db, log) is None
    db.close()


def test_behavioral_anomaly_flags_burst_above_baseline(client):
    db = SessionLocal()
    detector = BehavioralAnomalyDetector()
    now = datetime.utcnow()
    # Baseline: ~2/min average spread across the last 29 minutes (outside the
    # 1-minute "recent" window checked by the detector) — enough history for
    # the detector's minimum-baseline guard to engage.
    for i in range(60):
        _make_log(db, user_id=1, timestamp=now - timedelta(minutes=1.5 + (i % 28)))
    # Recent burst: well within the last minute, far above the baseline average.
    log = None
    for _ in range(10):
        log = _make_log(db, user_id=1, timestamp=now)
    result = detector.check(db, log)
    assert result is not None
    assert result["attack_type"] == AttackType.BEHAVIORAL_ANOMALY
    db.close()
