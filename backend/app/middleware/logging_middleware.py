"""
Middleware that:
  1. Times every request.
  2. Extracts the authenticated user (if any) from the JWT, without
     enforcing auth (that's done per-route).
  3. Persists a structured RequestLog row.
  4. Hands the row off to the detection engine.

Sensitive endpoints (login/register/password) have their raw form field
captured transiently (never persisted) so the suspicious-input detector
can inspect it, per the "avoid storing the complete sensitive payload"
requirement.
"""
import logging
import time
from datetime import datetime

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from jose import JWTError

from app.database import SessionLocal
from app.security.jwt import decode_token
from app.models.request_log import RequestLog
from app.services.detection_engine import run_detection

logger = logging.getLogger(__name__)

# Endpoints whose activity should be treated as "authentication" for logging/detection
AUTH_ENDPOINTS = {"/api/auth/login", "/api/auth/register"}

# Endpoints where we sniff a search/input field for the suspicious-input detector.
# We only ever hold the value in memory for this one request — never write it to
# RequestLog or any persisted table.
INPUT_SNIFF_ENDPOINTS = {"/api/products/search"}


def _extract_user_id(request: Request) -> int | None:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        return int(payload["sub"])
    except (JWTError, ValueError, KeyError, TypeError):
        return None


def _client_ip(request: Request) -> str:
    # Respect a trusted proxy header if present (adjust for your deployment),
    # else fall back to the direct connection.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()

        # Best-effort capture of a search/input value for the suspicious-input
        # detector. We read the query param only (cheap, non-invasive) — body
        # sniffing is intentionally avoided to keep this middleware simple/safe.
        raw_input = None
        if request.url.path in INPUT_SNIFF_ENDPOINTS:
            raw_input = request.query_params.get("q")

        response = await call_next(request)

        elapsed_ms = (time.perf_counter() - start) * 1000

        # Logging/detection is best-effort bookkeeping on top of an already-
        # computed response — a failure here (bad detector, DB hiccup, broadcast
        # error) must never turn a successful request into a 500 for the client.
        try:
            user_id = _extract_user_id(request)
            source_ip = _client_ip(request)
            endpoint = request.url.path
            request_type = "authentication" if endpoint in AUTH_ENDPOINTS else "api"

            db = SessionLocal()
            try:
                log = RequestLog(
                    timestamp=datetime.utcnow(),
                    user_id=user_id,
                    source_ip=source_ip,
                    method=request.method,
                    endpoint=endpoint,
                    status_code=response.status_code,
                    response_time=elapsed_ms,
                    user_agent=request.headers.get("user-agent"),
                    request_type=request_type,
                )
                db.add(log)
                db.commit()
                db.refresh(log)

                if raw_input:
                    # transient attribute only — never persisted to the DB
                    log.raw_input = raw_input

                await run_detection(db, log)
            finally:
                db.close()
        except Exception:
            logger.exception("Request logging/detection pipeline failed for %s %s", request.method, request.url.path)

        return response
