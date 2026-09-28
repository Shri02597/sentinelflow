"""
Enforcement middleware — the half of containment that actually stops traffic.

Runs for every incoming request after the logging middleware has recorded it,
and rejects with 403 if the caller's source IP or authenticated account is
currently blocked by the response policy.

Ordering matters and is set in main.py: middleware added *later* runs
*earlier*, so this is registered before the logging middleware. That way a
blocked request is still written to `request_logs` (with a 403 status) before
being rejected — which means a blocked host hammering the API shows up as a
suspicious-endpoint detection rather than silently disappearing.

Analysts and admins are never locked out of the console, even from a blocked
IP: a block you cannot inspect or undo is not a control, it's an outage. That
exemption is scoped to the /api/security and /api/admin prefixes, so a blocked
analyst can still use the shop-facing endpoints normally.
"""
import logging

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.database import SessionLocal
from app.models.user import UserRole
from app.security.jwt import decode_token
from app.services.containment import is_ip_blocked, is_user_blocked

logger = logging.getLogger(__name__)

PRIVILEGED_ROLES = {UserRole.ANALYST, UserRole.ADMIN}


def _decode_role_and_id(request: Request):
    """Best-effort identity read. Never raises — a bad token is just 'unknown'."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None, None
    try:
        payload = decode_token(auth_header.split(" ", 1)[1])
        if payload.get("type") != "access":
            return None, None
        return payload.get("role"), int(payload["sub"])
    except Exception:
        return None, None


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class EnforcementMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if any(path.startswith(prefix) for prefix in settings.enforcement_exempt_prefixes):
            return await call_next(request)

        role, user_id = _decode_role_and_id(request)
        # Never lock the people who respond to incidents out of their console.
        if role in {r.value for r in PRIVILEGED_ROLES}:
            return await call_next(request)

        source_ip = _client_ip(request)

        db = SessionLocal()
        try:
            block = is_ip_blocked(db, source_ip)
            target_label = f"IP {source_ip}"

            if block is None and user_id is not None:
                block = is_user_blocked(db, user_id)
                if block is not None:
                    target_label = f"account #{user_id}"

            if block is None:
                return await call_next(request)

            reason, blocked_at = block.reason, block.blocked_at
        except Exception:
            # A containment lookup failure must not take the whole API down —
            # fail open and let the request through, loudly.
            logger.exception("containment lookup failed for %s", source_ip)
            return await call_next(request)
        finally:
            db.close()

        return JSONResponse(
            status_code=403,
            content={
                "detail": "Access blocked by security policy",
                "reason": reason,
                "blocked_target": target_label,
                "blocked_at": blocked_at.isoformat() if blocked_at else None,
            },
        )
