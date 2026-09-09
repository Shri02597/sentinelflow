from datetime import datetime, timedelta
from typing import Literal

from jose import jwt, JWTError

from app.config import settings


def _create_token(subject: str, role: str, expires_minutes: int, token_type: Literal["access", "refresh"]) -> str:
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    payload = {"sub": subject, "role": role, "exp": expire, "type": token_type}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: int, role: str) -> str:
    return _create_token(str(user_id), role, settings.ACCESS_TOKEN_EXPIRE_MINUTES, "access")


def create_refresh_token(user_id: int, role: str) -> str:
    return _create_token(str(user_id), role, settings.REFRESH_TOKEN_EXPIRE_MINUTES, "refresh")


def decode_token(token: str) -> dict:
    """Raises jose.JWTError on invalid/expired token — caller converts to HTTP 401."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
