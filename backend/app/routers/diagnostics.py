"""
Deployment diagnostics.

The hosted service had a database and secret key that nobody could see from the
outside, and the only visible symptom was that accounts quietly disappeared
between demos. This endpoint answers those questions directly instead of
inferred from behaviour.

Admin-only, and it reports *configuration state* — never the values themselves.
It is deliberately not a secret leak: it answers "is the default key in use"
rather than "what is the key".
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.security.deps import require_roles

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("/diagnostics")
def diagnostics(
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    db_kind = settings.db_kind
    database_ok = True
    db_error = None
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - only on a broken connection
        database_ok = False
        db_error = str(exc)[:200]

    # Row counts are the quickest way to tell a real persistent database from a
    # container that just woke up empty. A long-lived deployment should not be
    # sitting on single-digit counts.
    counts = {}
    if database_ok:
        from app.models.security_event import SecurityEvent

        for label, model in (("users", User), ("security_events", SecurityEvent)):
            try:
                counts[label] = db.query(model).count()
            except Exception:  # pragma: no cover
                counts[label] = None

    return {
        "env": settings.env_resolved,
        "is_production": settings.is_production,
        "database": {
            "kind": db_kind,
            "reachable": database_ok,
            "error": db_error,
            "ephemeral": settings.db_is_ephemeral,
            "note": (
                "SQLite on a hosted platform is stored on a throwaway disk; data "
                "is lost when the instance sleeps. Set DATABASE_URL to managed "
                "Postgres."
                if settings.db_is_ephemeral
                else "persistent database"
            ),
        },
        "auth": {
            "using_default_secret": settings.using_default_secret,
            "note": (
                "SECRET_KEY is the published default, so admin tokens can be "
                "forged by anyone. Set the SECRET_KEY env var."
                if settings.using_default_secret
                else "SECRET_KEY is set"
            ),
            "bcrypt_rounds": settings.effective_bcrypt_rounds,
        },
        "seeding": {
            "enabled": settings.effective_seed_on_startup,
        },
        "row_counts": counts,
    }
