"""
Containment service — turns a detection into an actual response.

The detection engine decides *whether* something is an attack; this module
decides *what to do about it*, and is the only place that writes to the
response/containment tables. Two entry points:

  apply_action()  the explicit, single-step primitive. Analysts call it
                  directly from the dashboard; the auto-response policy
                  calls it with is_auto=True.
  auto_respond()  the policy hook, invoked after every detection, which
                  escalates on the subject's new risk score:
                    HIGH      -> WARN  (notify the account, no enforcement)
                    CRITICAL  -> BLOCK (403 the source IP on every request)

Design notes:
  - Blocking is per-source-IP, warning is per-account. An attacker's IP is the
    thing you can actually cut off; a user account is often the *victim* whose
    credentials are being guessed, and auto-locking it hands the attacker a
    account lockout as a bonus.
  - Every decision, automatic or manual, lands in the append-only
    ResponseAction audit trail. Nothing here silently mutates state.
  - The subject of a block is never the analyst's own console: enforcement
    exempts /api/security and /api/admin so a block can always be undone.
"""
from datetime import datetime
from typing import Optional
import ipaddress

from sqlalchemy.orm import Session

from app.config import settings
from app.models.response_action import (
    ResponseAction, BlockedIdentity, Notification,
    ActionType, TargetType, ActorRole,
)
from app.models.risk_score import RiskScore
from app.models.user import User, UserRole


def target_key_for_ip(ip: str) -> str:
    return ip


def target_key_for_user(user_id: int) -> str:
    return f"user:{user_id}"


def _existing_block(db: Session, target_type: TargetType, target_key: str) -> Optional[BlockedIdentity]:
    return (
        db.query(BlockedIdentity)
        .filter(BlockedIdentity.target_type == target_type, BlockedIdentity.target_key == target_key)
        .first()
    )


def is_ip_blocked(db: Session, source_ip: str) -> Optional[BlockedIdentity]:
    row = _existing_block(db, TargetType.IP, target_key_for_ip(source_ip))
    if row is not None and row.is_active:
        return row
    return None


def is_user_blocked(db: Session, user_id: int) -> Optional[BlockedIdentity]:
    row = _existing_block(db, TargetType.USER, target_key_for_user(user_id))
    if row is not None and row.is_active:
        return row
    return None


def is_auto_blockable_ip(ip: str) -> bool:
    """
    Whether the auto-response policy is allowed to cut this source off.

    Refuses loopback, private, link-local, reserved and multicast addresses.
    Blocking one of those is almost always wrong: it is either the analyst's own
    machine (local demo) or a shared NAT gateway (production), and in both
    cases the blast radius is everyone behind that address rather than the
    attacker. Manual analyst blocks bypass this — an analyst blocking their own
    machine to test enforcement is a legitimate thing to want.
    """
    if settings.AUTO_BLOCK_ALLOW_PRIVATE_IPS:
        return True
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        # Not a bare IP literal (a proxy supplied a hostname, say). Don't
        # guess: refusing to protect because a value was unparseable is the
        # worse of the two failure modes, so treat it as blockable.
        return True
    return not (
        addr.is_loopback
        or addr.is_private
        or addr.is_link_local
        or addr.is_reserved
        or addr.is_unspecified
        or addr.is_multicast
    )


def apply_action(
    db: Session,
    *,
    target_type: TargetType,
    target_key: str,
    action: ActionType,
    reason: str,
    source_event_id: Optional[int] = None,
    actor: Optional[User] = None,
    is_auto: bool = False,
    source_ip: Optional[str] = None,
    user_id: Optional[int] = None,
) -> ResponseAction:
    """
    Apply one containment action. Commits nothing — the caller owns the
    transaction — but does mutate `db` (adds audit row, flips block state,
    inserts a notification on WARN/BLOCK).

    UNBLOCK on something that isn't blocked is a no-op beyond the audit row,
    so a double-click on "Release" in the dashboard is harmless.
    """
    actor_role = ActorRole.SYSTEM
    if actor is not None:
        actor_role = ActorRole.ADMIN if actor.role == UserRole.ADMIN else ActorRole.ANALYST

    audit = ResponseAction(
        target_type=target_type,
        target_key=target_key,
        action=action,
        reason=reason,
        is_auto=is_auto,
        source_event_id=source_event_id,
        actor_id=actor.id if actor is not None else None,
        actor_role=actor_role,
    )
    db.add(audit)
    db.flush()  # need audit.id for the notification link

    if action is ActionType.BLOCK:
        block = _existing_block(db, target_type, target_key)
        if block is None:
            block = BlockedIdentity(
                target_type=target_type,
                target_key=target_key,
                is_active=True,
                reason=reason,
                source_event_id=source_event_id,
                created_by=actor.id if actor is not None else None,
            )
            db.add(block)
        else:
            block.is_active = True
            block.reason = reason
            block.blocked_at = datetime.utcnow()
            block.released_at = None
            block.source_event_id = source_event_id

    elif action is ActionType.UNBLOCK:
        block = _existing_block(db, target_type, target_key)
        if block is not None and block.is_active:
            block.is_active = False
            block.released_at = datetime.utcnow()

    # A warning is only meaningful if the subject can see it. WARN and BLOCK
    # both notify; only BLOCK additionally stops traffic.
    if action in (ActionType.WARN, ActionType.BLOCK):
        _notify(db, target_type, target_key, action, reason, source_event_id, source_ip, user_id)

    # Sessions here are built with autoflush=False, so flush explicitly rather
    # than depending on the caller's next query/commit to make the new state
    # visible. Callers still own the transaction.
    db.flush()

    return audit


def _notify(
    db: Session,
    target_type: TargetType,
    target_key: str,
    action: ActionType,
    reason: str,
    source_event_id: Optional[int],
    source_ip: Optional[str],
    user_id: Optional[int],
) -> Optional[Notification]:
    if target_type is TargetType.USER:
        resolved_user_id = user_id if user_id is not None else int(target_key.split(":", 1)[1])
    else:
        resolved_user_id = user_id

    # No account means no recipient. An anonymous source (someone brute-forcing
    # a login they don't have) can't be shown a banner, and an orphan row
    # addressed to nobody would just be dead weight nobody ever reads.
    if resolved_user_id is None:
        return None

    if action is ActionType.WARN:
        title = "Security warning"
        prefix = "Your account triggered a security warning."
    else:
        title = "Access blocked"
        prefix = "Access from your network has been blocked by security policy."

    notification = Notification(
        user_id=resolved_user_id,
        source_ip=source_ip,
        title=title,
        message=f"{prefix} {reason}".strip(),
        source_event_id=source_event_id,
    )
    db.add(notification)
    db.flush()
    return notification


def auto_respond(
    db: Session,
    *,
    risk_row: RiskScore,
    source_ip: str,
    event_id: int,
    attack_type: str,
    user_id: Optional[int] = None,
) -> list[ResponseAction]:
    """
    Auto-response policy, run after every detection. Escalates on the subject's
    *new* risk score and is deliberately idempotent — it won't re-warn or
    re-block a target that's already in the state being applied, so a burst of
    200 detections produces one warning, not 200.

    Returns the actions it actually applied (possibly empty).
    """
    if not settings.AUTO_RESPONSE_ENABLED:
        return []

    applied: list[ResponseAction] = []
    score = risk_row.score

    # --- CRITICAL: cut the source off. ---
    if score >= settings.AUTO_BLOCK_RISK_SCORE:
        key = target_key_for_ip(source_ip)
        if is_ip_blocked(db, source_ip) is None:
            if is_auto_blockable_ip(source_ip):
                applied.append(
                    apply_action(
                        db,
                        target_type=TargetType.IP,
                        target_key=key,
                        action=ActionType.BLOCK,
                        reason=(
                            f"Automatic block: risk score reached {score} (CRITICAL) after "
                            f"{attack_type} detection."
                        ),
                        source_event_id=event_id,
                        is_auto=True,
                        source_ip=source_ip,
                        user_id=user_id,
                    )
                )
            else:
                # Degrade to a warning rather than staying silent, so the audit
                # trail still records that a block was considered and why it
                # was declined. Silence here would look like the policy
                # simply hadn't fired.
                applied.append(
                    apply_action(
                        db,
                        target_type=TargetType.IP,
                        target_key=key,
                        action=ActionType.WARN,
                        reason=(
                            f"Automatic block withheld: {source_ip} is a loopback/private "
                            f"address (risk score {score}, {attack_type}). Manual block "
                            f"required to cut this source off."
                        ),
                        source_event_id=event_id,
                        is_auto=True,
                        source_ip=source_ip,
                        user_id=user_id,
                    )
                )
        return applied  # blocking supersedes warning

    # --- HIGH: warn the account, don't lock it out. ---
    if score >= settings.AUTO_WARN_RISK_SCORE:
        # Only re-notify every N events so one burst doesn't spam the user.
        prior = (
            db.query(ResponseAction)
            .filter(
                ResponseAction.target_type == TargetType.IP,
                ResponseAction.target_key == target_key_for_ip(source_ip),
                ResponseAction.action == ActionType.WARN,
            )
            .count()
        )
        if prior % max(settings.AUTO_RESPONSE_REPEAT_INTERVAL, 1) != 0:
            return applied

        applied.append(
            apply_action(
                db,
                target_type=TargetType.IP,
                target_key=target_key_for_ip(source_ip),
                action=ActionType.WARN,
                reason=(
                    f"Automatic warning: risk score reached {score} (HIGH) after "
                    f"{attack_type} detection."
                ),
                source_event_id=event_id,
                is_auto=True,
                source_ip=source_ip,
                user_id=user_id,
            )
        )

    return applied


def blocked_action_for_event(db: Session, event) -> Optional[ResponseAction]:
    """
    Most recent auto-response associated with a security event, so the threat
    detail page can show "this IP was already blocked for this" without the
    frontend having to correlate two lists.
    """
    return (
        db.query(ResponseAction)
        .filter(ResponseAction.source_event_id == event.id)
        .order_by(ResponseAction.id.desc())
        .first()
    )
