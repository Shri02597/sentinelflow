"""
SQLAlchemy engine/session management.
Supports PostgreSQL in production and SQLite as a local dev fallback.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

# Render/Heroku-style Postgres URLs use the "postgres://" scheme, which
# SQLAlchemy 1.4+ no longer accepts — normalize to "postgresql://".
DATABASE_URL = settings.DATABASE_URL
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    # Needed for SQLite when used with multiple threads (FastAPI + WS)
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create tables. In production, prefer Alembic migrations over this."""
    from app.models import user, request_log, security_event, incident, risk_score, product, cart_item  # noqa: F401
    Base.metadata.create_all(bind=engine)
