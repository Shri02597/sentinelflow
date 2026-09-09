"""
Basic per-IP rate limiting for sensitive endpoints (login, register,
password-related). Uses slowapi (a Flask-limiter-style wrapper over
FastAPI/Starlette). This works alongside — not instead of — the
detection engine: rate limiting stops abuse fast; detection explains it
on the dashboard.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
