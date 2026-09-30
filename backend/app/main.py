from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.config import settings
from app.database import init_db
from app.middleware.enforcement import EnforcementMiddleware
from app.middleware.logging_middleware import LoggingMiddleware
from app.utils.rate_limit import limiter

from app.routers import auth, users, security, ws, products, cart, admin, response, diagnostics

app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)

# --- Rate limiting ---
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- Containment (registered first => runs innermost) ---
# Only the inner part of the stack actually rejects traffic; the logging
# middleware below still records blocked attempts as 403s before that happens.
app.add_middleware(EnforcementMiddleware)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Request logging + detection pipeline (outermost) ---
app.add_middleware(LoggingMiddleware)

# --- Routers ---
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(security.router)
app.include_router(response.router)
app.include_router(admin.router)
app.include_router(ws.router)
app.include_router(diagnostics.router)


@app.on_event("startup")
def on_startup():
    # For the MVP: create tables directly. Swap for Alembic migrations
    # once the schema stabilizes for production use.
    init_db()

    # Seeding is idempotent but not free — it queries the database on every boot.
    # On a free platform that boots on demand, that cost lands on whoever happens
    # to make the first request, so skip it where the data is already there.
    if settings.effective_seed_on_startup:
        from app.services.seed import seed_products, seed_users
        seed_products()
        seed_users()
    else:
        print("[startup] demo seeding skipped (SEED_ON_STARTUP disabled or production)")

    # Surface configuration mistakes at boot. A missing SECRET_KEY or a
    # throwaway database file won't crash the service — it just quietly loses
    # data or accepts forged admin tokens, which is far worse than a failed
    # deploy.
    if settings.using_default_secret:
        print(
            "[startup][WARNING] SECRET_KEY is the built-in default. Anyone can forge "
            "an admin JWT. Set the SECRET_KEY env var on this service."
        )
    if settings.db_is_ephemeral:
        print(
            "[startup][WARNING] DATABASE_URL is SQLite on a hosted platform. The "
            "filesystem is discarded when the instance sleeps, so accounts and "
            "events will be lost. Set DATABASE_URL to a managed Postgres instance."
        )


@app.get("/")
def root():
    return RedirectResponse(url="/docs")


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.env_resolved}
