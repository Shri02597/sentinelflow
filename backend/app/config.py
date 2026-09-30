"""
Central configuration for SentinelFlow backend.
All values are sourced from environment variables (.env in dev).
Never hard-code secrets or connection strings here.
"""
from functools import lru_cache
from typing import List
import os

from pydantic_settings import BaseSettings, SettingsConfigDict


def _detect_env() -> str:
    """
    Work out whether this is production without relying on anyone remembering to
    set an env var.

    The hosted service was running with the development default because the
    blueprint variables never made it onto the service. PaaS providers set their
    own marker (`RENDER=true`), so treat that as authoritative: an explicit
    `ENV` still wins, but its absence no longer silently means "development".
    """
    explicit = os.environ.get("ENV", "").strip()
    if explicit:
        return explicit
    return "production" if os.environ.get("RENDER", "").strip() else "development"


# Kept as a named constant so the diagnostics endpoint can report whether the
# signing key is still the published fallback without ever echoing the real one.
# Anyone can forge an admin token if this is what a deployment is using.
DEFAULT_SECRET_KEY = "default_sentinelflow_super_secret_jwt_key_2026_xyz987"


class Settings(BaseSettings):
    # --- App ---
    APP_NAME: str = "SentinelFlow"
    ENV: str = ""
    DEBUG: bool = True

    # --- Database ---
    # Example (Postgres): postgresql+psycopg2://user:pass@host:5432/dbname
    # Example (SQLite fallback for local dev): sqlite:///./sentinelflow.db
    DATABASE_URL: str = "sqlite:///./sentinelflow.db"

    # --- Auth / JWT ---
    SECRET_KEY: str = DEFAULT_SECRET_KEY
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    # --- CORS ---
    # In production the Vercel frontend is the primary origin; keeping it in the
    # default lets the deployed app work without any env-var setup step.
    CORS_ORIGINS: str = "http://localhost:5173,https://sentinelflow-zeta.vercel.app"

    # --- Frontend ---
    FRONTEND_URL: str = "http://localhost:5173"

    # --- Detection engine thresholds (tunable without redeploying detectors) ---
    BRUTE_FORCE_MAX_ATTEMPTS: int = 5
    BRUTE_FORCE_WINDOW_SECONDS: int = 300  # 5 minutes

    ABNORMAL_RATE_NORMAL_MAX: int = 30      # requests/min considered normal
    ABNORMAL_RATE_SUSPICIOUS_MIN: int = 100 # requests/min considered suspicious
    ABNORMAL_RATE_WINDOW_SECONDS: int = 60

    SUSPICIOUS_ENDPOINT_404_THRESHOLD: int = 10
    SUSPICIOUS_ENDPOINT_WINDOW_SECONDS: int = 300

    BEHAVIORAL_BASELINE_WINDOW_MINUTES: int = 30
    BEHAVIORAL_DEVIATION_MULTIPLIER: float = 3.0  # x times baseline triggers anomaly

    # --- Risk scoring weights (modular; tune freely) ---
    RISK_WEIGHT_AUTH_FAILURE: int = 20
    RISK_WEIGHT_ABNORMAL_RATE: int = 25
    RISK_WEIGHT_SUSPICIOUS_INPUT: int = 30
    RISK_WEIGHT_SUSPICIOUS_ENDPOINT: int = 20
    RISK_WEIGHT_BEHAVIORAL_ANOMALY: int = 20
    RISK_WEIGHT_REPEAT_EVENT_BONUS: int = 5
    RISK_SCORE_MAX: int = 100

    # --- Automated response / containment policy ---
    # When a detection pushes a subject's risk score past these thresholds the
    # platform acts on it without waiting for an analyst: WARN first, then
    # BLOCK. Set AUTO_RESPONSE_ENABLED=False to keep the platform detect-only.
    AUTO_RESPONSE_ENABLED: bool = True
    AUTO_WARN_RISK_SCORE: int = 60   # HIGH  -> notify the account
    AUTO_BLOCK_RISK_SCORE: int = 80  # CRITICAL -> block the source IP
    AUTO_RESPONSE_REPEAT_INTERVAL: int = 5  # re-notify every N events once warned

    # Never auto-block loopback/private/link-local addresses. Two reasons: in a
    # local demo the analyst and the "attacker" share one address, so a block
    # takes down the whole app; and in production a private range is frequently
    # a shared NAT gateway, so auto-blocking it locks out an entire office.
    # Manual analyst blocks are never restricted by this.
    AUTO_BLOCK_ALLOW_PRIVATE_IPS: bool = False

    # Enforcement middleware. Blocked subjects get a 403 on these prefixes
    # unless the caller is an ANALYST/ADMIN, who are never locked out of the
    # console that would let them undo the block.
    # /api/auth is exempt on purpose. Containment blocks *storefront* access; it
    # is not meant to prevent login attempts, and rate limiting already caps
    # those (RATE_LIMIT_LOGIN_PER_MINUTE). Blocking it here would be a lockout
    # with no exit: a blocked IP could not authenticate, so it could never reach
    # the analyst console to release itself, and neither could the analyst.
    ENFORCEMENT_EXEMPT_PREFIXES: str = (
        "/api/health,/docs,/openapi.json,/redoc,/api/security,/api/admin,/api/auth,/ws"
    )

    # --- Rate limiting (sensitive endpoints) ---
    RATE_LIMIT_LOGIN_PER_MINUTE: int = 10
    RATE_LIMIT_REGISTER_PER_MINUTE: int = 25
    RATE_LIMIT_PASSWORD_PER_MINUTE: int = 15

    # --- Password hashing cost ---
    # bcrypt is deliberately slow; 12 rounds costs ~360ms per verify, which is
    # pure dead time in front of a login form. OWASP treats a work factor of 10
    # as the acceptable floor, and it is roughly 4x faster (~88ms). Left
    # unset, production-like environments take the lower figure automatically
    # and local development keeps the stronger one.
    BCRYPT_ROUNDS: int = 10

    # --- Demo seeding ---
    # Idempotent, but it still runs queries on every boot. On a platform that
    # discards the filesystem on each wake, that's seconds added to the first
    # request of every session.
    SEED_ON_STARTUP: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Derived, read-only facts about this deployment ---
    @property
    def is_production(self) -> bool:
        return _detect_env() == "production"

    @property
    def env_resolved(self) -> str:
        return _detect_env()

    @property
    def db_kind(self) -> str:
        url = (self.DATABASE_URL or "").lower()
        if url.startswith(("postgres://", "postgresql://")):
            return "postgres"
        if url.startswith("sqlite"):
            return "sqlite"
        return "unknown"

    @property
    def db_is_ephemeral(self) -> bool:
        """
        True when data lives on a platform's throwaway disk. SQLite on a free
        container is erased every time the instance spins down, so accounts
        registered today can be gone tomorrow with no trace.
        """
        return self.db_kind == "sqlite"

    @property
    def using_default_secret(self) -> bool:
        return (self.SECRET_KEY or "") == DEFAULT_SECRET_KEY

    @property
    def effective_bcrypt_rounds(self) -> int:
        # An explicit setting always wins; otherwise choose by environment.
        if "BCRYPT_ROUNDS" in os.environ:
            return self.BCRYPT_ROUNDS
        return 10 if self.is_production else 12

    @property
    def effective_seed_on_startup(self) -> bool:
        if "SEED_ON_STARTUP" in os.environ:
            return self.SEED_ON_STARTUP
        # Seeding exists so a fresh demo database has something to show. Against
        # a real Postgres instance the data is already there and the queries are
        # just boot latency.
        return not self.is_production

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        frontend = (self.FRONTEND_URL or "").strip()
        if frontend and frontend not in origins:
            origins.append(frontend)
        return origins

    @property
    def enforcement_exempt_prefixes(self) -> List[str]:
        return [p.strip() for p in self.ENFORCEMENT_EXEMPT_PREFIXES.split(",") if p.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
