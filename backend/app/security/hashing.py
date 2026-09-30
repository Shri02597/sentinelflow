from functools import lru_cache

from passlib.context import CryptContext

from app.config import settings


@lru_cache(maxsize=8)
def _context(rounds: int) -> CryptContext:
    return CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=rounds)


def pwd_context() -> CryptContext:
    """
    The cost is read from settings rather than hard-coded so it can be tuned per
    environment. `lru_cache` keeps one context per distinct value, so this stays
    a dict lookup in the hot path and doesn't re-read config per request.
    """
    return _context(settings.effective_bcrypt_rounds)


def hash_password(password: str) -> str:
    return pwd_context().hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context().verify(plain_password, hashed_password)
