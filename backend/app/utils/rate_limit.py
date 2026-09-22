"""
Basic per-IP rate limiting for sensitive endpoints (login, register,
password-related). Uses slowapi (a Flask-limiter-style wrapper over
FastAPI/Starlette). This works alongside — not instead of — the
detection engine: rate limiting stops abuse fast; detection explains it
on the dashboard.
"""
from slowapi import Limiter
from starlette.requests import Request


def get_remote_address(request: Request) -> str:
    """Use the real client IP even behind a proxy (Render/Vercel set X-Forwarded-For)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=get_remote_address)
