"""
Central configuration for SentinelFlow backend.
All values are sourced from environment variables (.env in dev).
Never hard-code secrets or connection strings here.
"""
from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- App ---
    APP_NAME: str = "SentinelFlow"
    ENV: str = "development"
    DEBUG: bool = True

    # --- Database ---
    # Example (Postgres): postgresql+psycopg2://user:pass@host:5432/dbname
    # Example (SQLite fallback for local dev): sqlite:///./sentinelflow.db
    DATABASE_URL: str = "sqlite:///./sentinelflow.db"

    # --- Auth / JWT ---
    SECRET_KEY: str = "default_sentinelflow_super_secret_jwt_key_2026_xyz987"
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

    # --- Rate limiting (sensitive endpoints) ---
    RATE_LIMIT_LOGIN_PER_MINUTE: int = 10
    RATE_LIMIT_REGISTER_PER_MINUTE: int = 25
    RATE_LIMIT_PASSWORD_PER_MINUTE: int = 15

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        frontend = (self.FRONTEND_URL or "").strip()
        if frontend and frontend not in origins:
            origins.append(frontend)
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
