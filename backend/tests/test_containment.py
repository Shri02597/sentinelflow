"""
Response / containment tests.

Covers the three things that make the response feature real rather than
decorative:
  1. A block actually stops traffic (403 from that IP / account).
  2. A block can't lock the responders out of the console that undoes it.
  3. The auto-response policy escalates on risk score, and is idempotent
     enough that a detection burst produces one action, not hundreds.
"""
from datetime import datetime

import pytest

from app.config import settings
from app.database import SessionLocal
from app.models.risk_score import RiskScore, RiskLevel
from app.models.response_action import ActionType, TargetType
from app.models.security_event import AttackType, SecurityEvent
from app.models.user import User, UserRole
from app.services.containment import (
    apply_action, auto_respond, is_auto_blockable_ip, is_ip_blocked, target_key_for_ip,
)

# Genuinely public addresses. The RFC 5737 documentation ranges (203.0.113.x,
# 198.51.100.x) are reported as private by Python's ipaddress module, so using
# them here would silently exercise the private-address exemption path.
ATTACKER_IP = "45.33.32.156"
ATTACKER_HEADERS = {"X-Forwarded-For": ATTACKER_IP}


def _register_and_login(client, email, username, password="Passw0rd123"):
    client.post("/api/auth/register", json={"email": email, "username": username, "password": password})
    return client.post(
        "/api/auth/login", json={"email": email, "password": password}
    ).json()["access_token"]


def _analyst_headers(client, email="analyst@example.com", username="analyst1"):
    """Register, promote to ANALYST, and log back in so the role claim is fresh."""
    token = _register_and_login(client, email, username)
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    user.role = UserRole.ANALYST
    db.commit()
    db.close()
    token = client.post(
        "/api/auth/login", json={"email": email, "password": "Passw0rd123"}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _make_event(db, ip, attack_type=AttackType.BRUTE_FORCE, user_id=None, severity=None):
    from app.models.security_event import Severity

    event = SecurityEvent(
        timestamp=datetime.utcnow(),
        event_type="authentication",
        attack_type=attack_type,
        severity=severity or Severity.HIGH,
        risk_score=0,
        confidence=0.9,
        user_id=user_id,
        source_ip=ip,
        endpoint="/api/auth/login",
        description="test event",
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


# --------------------------------------------------------------------------
# Enforcement: does a block actually stop traffic?
# --------------------------------------------------------------------------
def test_blocked_ip_is_rejected_with_403(client):
    headers = _analyst_headers(client)
    event_id = None
    db = SessionLocal()
    event = _make_event(db, ATTACKER_IP)
    event_id = event.id
    db.close()

    # Baseline: the attacker's IP can reach the API.
    assert client.get("/api/products", headers=ATTACKER_HEADERS).status_code == 200

    resp = client.post(
        "/api/security/response",
        json={"event_id": event_id, "action": "BLOCK", "reason": "brute force"},
        headers=headers,
    )
    assert resp.status_code == 201
    assert resp.json()["action"] == "BLOCK"
    assert resp.json()["is_auto"] is False

    blocked = client.get("/api/products", headers=ATTACKER_HEADERS)
    assert blocked.status_code == 403
    assert blocked.json()["detail"] == "Access blocked by security policy"
    assert ATTACKER_IP in blocked.json()["blocked_target"]


def test_blocked_request_is_still_logged(client):
    """
    A rejected request must leave a RequestLog row, otherwise a blocked host
    probing the API is invisible to the very detectors meant to catch it.
    """
    from app.models.request_log import RequestLog

    headers = _analyst_headers(client)
    db = SessionLocal()
    event = _make_event(db, ATTACKER_IP)
    event_id = event.id
    db.close()

    client.post(
        "/api/security/response",
        json={"event_id": event_id, "action": "BLOCK"},
        headers=headers,
    )
    assert client.get("/api/products", headers=ATTACKER_HEADERS).status_code == 403

    db = SessionLocal()
    rejected = (
        db.query(RequestLog)
        .filter(RequestLog.source_ip == ATTACKER_IP, RequestLog.status_code == 403)
        .first()
    )
    assert rejected is not None, "blocked request was not recorded in request_logs"
    db.close()


def test_analyst_console_stays_reachable_from_a_blocked_ip(client):
    """
    The response console lives under /api/security. If enforcement applied to
    it, a block could become an unrecoverable outage.
    """
    headers = _analyst_headers(client)
    db = SessionLocal()
    event = _make_event(db, ATTACKER_IP)
    event_id = event.id
    db.close()

    client.post(
        "/api/security/response", json={"event_id": event_id, "action": "BLOCK"}, headers=headers
    )

    console = client.get("/api/security/stats", headers={**headers, **ATTACKER_HEADERS})
    assert console.status_code == 200
    assert client.get("/api/security/response/blocked", headers={**headers, **ATTACKER_HEADERS}).status_code == 200


def test_a_blocked_ip_can_still_authenticate_so_it_can_undo_its_own_block(client):
    """
    Regression: enforcement used to cover /api/auth, which made containment
    self-trapping. A blocked IP got 403 at login, so it could never obtain a
    token, so it could never reach the analyst console to release itself -- and
    neither could the analyst, who was locked out of the same machine. The
    escape hatch has to exist for a block to be a control rather than an
    outage. Brute force is still bounded by the login rate limit.
    """
    analyst_headers = _analyst_headers(client)
    db = SessionLocal()
    event_id = _make_event(db, ATTACKER_IP).id
    db.close()

    client.post(
        "/api/security/response", json={"event_id": event_id, "action": "BLOCK"}, headers=analyst_headers
    )

    # The blocked host is still stopped from the storefront...
    assert client.get("/api/products", headers=ATTACKER_HEADERS).status_code == 403
    # ...but can still obtain a token, which is what makes release possible.
    token = client.post(
        "/api/auth/login",
        json={"email": "analyst@example.com", "password": "Passw0rd123"},
        headers=ATTACKER_HEADERS,
    )
    assert token.status_code == 200
    assert client.get(
        "/api/security/response/blocked",
        headers={**ATTACKER_HEADERS, "Authorization": f"Bearer {token.json()['access_token']}"},
    ).status_code == 200


def test_blocked_account_cannot_use_the_api(client):
    """Blocking by account locks that account out regardless of source IP."""
    analyst_headers = _analyst_headers(client)
    victim_token = _register_and_login(client, "victim@example.com", "victim")

    db = SessionLocal()
    victim = db.query(User).filter(User.email == "victim@example.com").first()
    victim_id = victim.id
    db.close()

    resp = client.post(
        "/api/security/response",
        json={"target_type": "USER", "user_id": victim_id, "action": "BLOCK", "reason": "account takeover"},
        headers=analyst_headers,
    )
    assert resp.status_code == 201

    locked_out = client.get(
        "/api/products", headers={"Authorization": f"Bearer {victim_token}"}
    )
    assert locked_out.status_code == 403
    assert f"account #{victim_id}" in locked_out.json()["blocked_target"]


# --------------------------------------------------------------------------
# Warning is not blocking
# --------------------------------------------------------------------------
def test_warn_notifies_the_account_without_blocking_it(client):
    """
    A warning only reaches an account that exists. The event here is
    authenticated (a behavioural anomaly on a real session), so the subject can
    see it — and crucially, is *not* locked out, because locking the account
    would just hand an attacker a denial of service.
    """
    token = _register_and_login(client, "warned@example.com", "warneduser")
    analyst_headers = _analyst_headers(client)

    db = SessionLocal()
    account = db.query(User).filter(User.email == "warned@example.com").first()
    event = _make_event(db, "45.33.32.90", user_id=account.id, attack_type=AttackType.BEHAVIORAL_ANOMALY)
    event_id = event.id
    db.close()

    resp = client.post(
        "/api/security/response", json={"event_id": event_id, "action": "WARN"}, headers=analyst_headers
    )
    assert resp.status_code == 201
    assert resp.json()["action"] == "WARN"

    # Traffic still flows.
    assert client.get(
        "/api/products", headers={"Authorization": f"Bearer {token}"}
    ).status_code == 200

    notes = client.get("/api/security/notifications", headers={"Authorization": f"Bearer {token}"})
    assert notes.status_code == 200
    assert any(n["title"] == "Security warning" for n in notes.json())


def test_warn_on_anonymous_traffic_creates_no_orphan_notification(client):
    """
    An anonymous brute force has no account to address. The action is still
    recorded in the audit trail, but no unreadable notification row is created.
    """
    analyst_headers = _analyst_headers(client)
    db = SessionLocal()
    event = _make_event(db, ATTACKER_IP)  # user_id is None
    event_id = event.id
    db.close()

    client.post("/api/security/response", json={"event_id": event_id, "action": "WARN"}, headers=analyst_headers)

    db = SessionLocal()
    from app.models.response_action import Notification, ResponseAction

    assert db.query(Notification).filter(Notification.user_id.is_(None)).count() == 0
    assert db.query(ResponseAction).filter(
        ResponseAction.source_event_id == event_id,
        ResponseAction.action == ActionType.WARN,
    ).count() == 1
    db.close()


def test_notifications_are_scoped_to_their_owner(client):
    _register_and_login(client, "owner@example.com", "owner1")
    other_token = _register_and_login(client, "nosy@example.com", "nosy1")
    analyst_headers = _analyst_headers(client)

    db = SessionLocal()
    owner = db.query(User).filter(User.email == "owner@example.com").first()
    event = _make_event(db, ATTACKER_IP, user_id=owner.id)
    event_id = event.id
    db.close()

    client.post("/api/security/response", json={"event_id": event_id, "action": "WARN"}, headers=analyst_headers)

    other = client.get("/api/security/notifications", headers={"Authorization": f"Bearer {other_token}"})
    assert other.status_code == 200
    assert other.json() == []


# --------------------------------------------------------------------------
# Undoing a block
# --------------------------------------------------------------------------
def test_release_restores_access_and_is_recorded(client):
    headers = _analyst_headers(client)
    db = SessionLocal()
    event = _make_event(db, ATTACKER_IP)
    event_id = event.id
    db.close()

    client.post("/api/security/response", json={"event_id": event_id, "action": "BLOCK"}, headers=headers)
    assert client.get("/api/products", headers=ATTACKER_HEADERS).status_code == 403

    resp = client.post(
        "/api/security/response/release",
        params={"target_type": "IP", "target_key": ATTACKER_IP, "reason": "confirmed false positive"},
        headers=headers,
    )
    assert resp.status_code == 201
    assert resp.json()["action"] == "UNBLOCK"

    assert client.get("/api/products", headers=ATTACKER_HEADERS).status_code == 200

    trail = client.get(
        "/api/security/response/actions", params={"target_key": ATTACKER_IP}, headers=headers
    ).json()
    assert [a["action"] for a in trail] == ["UNBLOCK", "BLOCK"]


# --------------------------------------------------------------------------
# RBAC on the response endpoints
# --------------------------------------------------------------------------
def test_regular_user_cannot_block_anyone(client):
    token = _register_and_login(client, "nosy2@example.com", "nosy2")
    resp = client.post(
        "/api/security/response",
        json={"target_type": "IP", "source_ip": ATTACKER_IP, "action": "BLOCK"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


# --------------------------------------------------------------------------
# Auto-response policy
# --------------------------------------------------------------------------
def test_auto_response_warns_at_high_and_blocks_at_critical(client):
    db = SessionLocal()
    try:
        event = _make_event(db, ATTACKER_IP)

        high = RiskScore(user_id=None, source_ip=ATTACKER_IP, score=settings.AUTO_WARN_RISK_SCORE,
                         level=RiskLevel.HIGH, reasons="[]")
        db.add(high)
        db.commit()
        actions = auto_respond(db, risk_row=high, source_ip=ATTACKER_IP, event_id=event.id,
                               attack_type=AttackType.BRUTE_FORCE.value)
        assert [a.action for a in actions] == [ActionType.WARN]
        assert is_ip_blocked(db, ATTACKER_IP) is None, "HIGH must not block"

        critical = RiskScore(user_id=None, source_ip=ATTACKER_IP, score=settings.AUTO_BLOCK_RISK_SCORE,
                             level=RiskLevel.CRITICAL, reasons="[]")
        db.add(critical)
        db.commit()
        actions = auto_respond(db, risk_row=critical, source_ip=ATTACKER_IP, event_id=event.id,
                               attack_type=AttackType.BRUTE_FORCE.value)
        assert [a.action for a in actions] == [ActionType.BLOCK]
        assert is_ip_blocked(db, ATTACKER_IP) is not None
    finally:
        db.close()


def test_auto_response_does_nothing_below_the_warn_threshold(client):
    db = SessionLocal()
    try:
        event = _make_event(db, ATTACKER_IP)
        low = RiskScore(user_id=None, source_ip=ATTACKER_IP, score=25, level=RiskLevel.LOW, reasons="[]")
        db.add(low)
        db.commit()
        assert auto_respond(db, risk_row=low, source_ip=ATTACKER_IP, event_id=event.id,
                            attack_type=AttackType.SUSPICIOUS_INPUT.value) == []
    finally:
        db.close()


def test_auto_response_is_idempotent_across_a_detection_burst(client):
    """
    A single burst can produce dozens of detections. Re-blocking on each one
    would spam the audit trail and the dashboard, so a target already in the
    target state must be left alone.
    """
    db = SessionLocal()
    try:
        event = _make_event(db, ATTACKER_IP)
        critical = RiskScore(user_id=None, source_ip=ATTACKER_IP, score=95,
                             level=RiskLevel.CRITICAL, reasons="[]")
        db.add(critical)
        db.commit()

        first = auto_respond(db, risk_row=critical, source_ip=ATTACKER_IP, event_id=event.id,
                             attack_type=AttackType.BRUTE_FORCE.value)
        second = auto_respond(db, risk_row=critical, source_ip=ATTACKER_IP, event_id=event.id,
                              attack_type=AttackType.BRUTE_FORCE.value)
        assert len(first) == 1
        assert second == []
    finally:
        db.close()


def test_auto_response_respects_the_kill_switch(client, monkeypatch):
    monkeypatch.setattr(settings, "AUTO_RESPONSE_ENABLED", False)
    db = SessionLocal()
    try:
        event = _make_event(db, ATTACKER_IP)
        critical = RiskScore(user_id=None, source_ip=ATTACKER_IP, score=100,
                             level=RiskLevel.CRITICAL, reasons="[]")
        db.add(critical)
        db.commit()
        assert auto_respond(db, risk_row=critical, source_ip=ATTACKER_IP, event_id=event.id,
                            attack_type=AttackType.BRUTE_FORCE.value) == []
    finally:
        db.close()


# --------------------------------------------------------------------------
# Private / loopback addresses must not be auto-blocked
# --------------------------------------------------------------------------
def test_loopback_and_private_addresses_are_not_auto_blockable(client):
    for ip in ["127.0.0.1", "10.1.2.3", "192.168.1.1", "172.16.0.1", "169.254.1.1", "203.0.113.7"]:
        assert is_auto_blockable_ip(ip) is False, f"{ip} should not be auto-blockable"
    assert is_auto_blockable_ip(ATTACKER_IP) is True
    assert is_auto_blockable_ip("8.8.8.8") is True


def test_auto_response_warns_instead_of_blocking_loopback(client):
    """
    On a local demo the analyst and the attacker share 127.0.0.1, so a block
    would take down the whole app. The policy must decline the block, say so
    in the audit trail, and still warn.
    """
    db = SessionLocal()
    try:
        event = _make_event(db, "127.0.0.1")
        critical = RiskScore(user_id=None, source_ip="127.0.0.1", score=95,
                             level=RiskLevel.CRITICAL, reasons="[]")
        db.add(critical)
        db.commit()

        actions = auto_respond(db, risk_row=critical, source_ip="127.0.0.1", event_id=event.id,
                              attack_type=AttackType.BRUTE_FORCE.value)
        assert [a.action for a in actions] == [ActionType.WARN]
        assert is_ip_blocked(db, "127.0.0.1") is None
        assert "withheld" in actions[0].reason
    finally:
        db.close()


def test_manual_block_still_works_on_a_private_address(client, monkeypatch):
    """
    The exemption is only on the *automatic* path. An analyst blocking their
    own machine to verify enforcement works is a legitimate thing to want.
    """
    monkeypatch.setattr(settings, "AUTO_BLOCK_ALLOW_PRIVATE_IPS", False)
    headers = _analyst_headers(client)
    resp = client.post(
        "/api/security/response",
        json={"target_type": "IP", "source_ip": "127.0.0.1", "action": "BLOCK", "reason": "enforcement test"},
        headers=headers,
    )
    assert resp.status_code == 201
    assert resp.json()["action"] == "BLOCK"


# --------------------------------------------------------------------------
# Attribution: which IP is worst, and what is it doing?
# --------------------------------------------------------------------------
def test_top_threats_ranks_by_risk_and_names_the_attack(client):
    headers = _analyst_headers(client)
    db = SessionLocal()
    try:
        from app.models.security_event import Severity

        bad_ip = "45.33.32.200"
        # The bad IP: three detections, dominated by endpoint scanning, and the
        # highest risk score on the board.
        _make_event(db, bad_ip, attack_type=AttackType.SUSPICIOUS_ENDPOINT, severity=Severity.CRITICAL)
        _make_event(db, bad_ip, attack_type=AttackType.SUSPICIOUS_ENDPOINT, severity=Severity.HIGH)
        _make_event(db, bad_ip, attack_type=AttackType.ABNORMAL_RATE, severity=Severity.HIGH)
        db.add(RiskScore(user_id=None, source_ip=bad_ip, score=90, level=RiskLevel.CRITICAL, reasons="[]"))

        # A single lower-severity detection from a different host.
        other_ip = "45.33.32.201"
        _make_event(db, other_ip, attack_type=AttackType.SUSPICIOUS_INPUT, severity=Severity.MEDIUM)
        db.add(RiskScore(user_id=None, source_ip=other_ip, score=30,
                         level=RiskLevel.MEDIUM, reasons="[]"))
        db.commit()
    finally:
        db.close()

    resp = client.get("/api/security/threats/top", headers=headers)
    assert resp.status_code == 200
    rows = resp.json()
    assert rows[0]["source_ip"] == bad_ip
    assert rows[0]["risk_score"] == 90
    assert rows[0]["risk_level"] == "CRITICAL"
    assert rows[0]["dominant_attack_type"] == "SUSPICIOUS_ENDPOINT"
    assert rows[0]["event_count"] == 3
    assert rows[0]["attacks"]["SUSPICIOUS_ENDPOINT"] == 2
    assert rows[0]["is_blocked"] is False
    assert rows[1]["source_ip"] == other_ip


def test_top_threats_reflects_the_response_already_taken(client):
    headers = _analyst_headers(client)
    db = SessionLocal()
    try:
        event = _make_event(db, ATTACKER_IP)
        event_id = event.id
        db.add(RiskScore(user_id=None, source_ip=ATTACKER_IP, score=85,
                         level=RiskLevel.CRITICAL, reasons="[]"))
        db.commit()
    finally:
        db.close()

    client.post("/api/security/response", json={"event_id": event_id, "action": "BLOCK"}, headers=headers)

    row = client.get("/api/security/threats/top", headers=headers).json()[0]
    assert row["is_blocked"] is True

    blocked = client.get("/api/security/response/blocked", headers=headers).json()
    assert len(blocked) == 1
    assert blocked[0]["target_key"] == target_key_for_ip(ATTACKER_IP)
    assert blocked[0]["is_active"] is True
