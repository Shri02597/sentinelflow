# SentinelFlow – Deployment & Demo Kit

Complete reference for the live deployment, credentials, demo flows, and architecture.

---

## 1. Live URLs

| What | URL |
|---|---|
| **Frontend (ShopFlow + Dashboard)** | https://sentinelflow-zeta.vercel.app |
| **Backend API (FastAPI)** | https://sentinelflow-api-g7p8.onrender.com |
| **API Docs (Swagger UI)** | https://sentinelflow-api-g7p8.onrender.com/docs |
| **OpenAPI schema** | https://sentinelflow-api-g7p8.onrender.com/openapi.json |
| **Health check** | https://sentinelflow-api-g7p8.onrender.com/api/health |
| **GitHub repo** | https://github.com/Shri02597/sentinelflow (branch: `main`) |

Deploy backends:
- **Vercel** – frontend (`frontend/` root). Auto-deploys on push to `main`.
- **Render** – backend web service + managed Postgres. Service ID `srv-danrsav40ujc73cv0uug`. Auto-deploys on push to `main`.

> Note: Render's free plan spins the instance down after inactivity; the first request after idle can take ~50s to respond. It wakes itself automatically.

---

## 2. Accounts & Credentials

> [!WARNING]
> **This repository is public, and so are the demo credentials below** — the seed
> passwords are hard-coded in `backend/app/services/seed.py`. That is fine for a
> college demo on throwaway data. It is not fine for anything real. Before this
> project goes anywhere near production, change the seeded passwords, set a
> non-default `SECRET_KEY`, and point `DATABASE_URL` at a real database.
> See §10 for how to confirm none of that is still misconfigured.

### Seeded accounts (created automatically at first startup)

| Role | Email | Username | Password |
|---|---|---|---|
| **Admin** | `admin@sentinelflow.io` | `admin` | `AdminPassword123!` |
| **Analyst** | `analyst@sentinelflow.io` | `analyst` | `AnalystPassword123!` |
| **Demo user** | `user@sentinelflow.io` | `demouser` | `UserPassword123!` |

### Registration (for friends / demo users)

Anyone can register at `https://sentinelflow-zeta.vercel.app/register` with:

- **Email** – any valid-looking email, must be unique (no verification email is sent)
- **Username** – 3–100 chars, must be unique
- **Password** – 8–128 chars (no complexity requirement)

Sample throwaway accounts:

| Email | Username | Password |
|---|---|---|
| `demo1@gmail.com` | `demo1` | `password123` |
| `demo2@gmail.com` | `demo2` | `password123` |
| `friend1@gmail.com` | `friend1` | `password123` |

### Role rules

- Register always creates a **USER** (no self-serve admin/analyst).
- Analyst/admin access is seed-only or admin-promoted via `PATCH /api/admin/users/{user_id}/role`.
- Dashboard `/security` requires **ANALYST** or **ADMIN**.

---

## 3. Demo Flow

### Normal user
1. Open https://sentinelflow-zeta.vercel.app
2. Register (or login with seeded `demouser`)
3. Browse products → search → open details → add to cart → mock checkout
4. View Profile / Activity

### Security analyst / admin
1. Login with `admin` or `analyst` credentials
2. Open `/security` – dashboard shows events live over WebSocket

### Trigger a detection (brute force demo)
1. Open the Login page
2. Enter any email + **wrong password**
3. Repeat **5 times within 5 minutes** (same network/IP)
4. The 5th failure creates a **BRUTE_FORCE** event on the dashboard:
   - 5–9 failures = **HIGH**
   - 10+ = **CRITICAL**

### Other detection scenarios
- **Suspicious input** – search field with SQL/XSS-like text (e.g. `' OR '1'='1`)
- **Abnormal rate** – many requests quickly from one IP (100+/min flagged)
- **Suspicious endpoint** – repeated scraped/404 endpoints
- **Behavioral anomaly** – an authenticated user suddenly behaving very differently from baseline

### Cross-check a phone's IP
1. On the phone, open `https://api.ipify.org` → note public IP
2. Have the phone trigger an event (e.g., wrong-password logins)
3. On the dashboard, the event's **Source IP** should match (Note: phone on mobile data may rotate IPs; devices on the same WiFi share one public IP)

---

## 4. Detection & Rate-Limit Configuration (defaults)

| Setting | Value |
|---|---|
| Brute force threshold | 5 failed logins / 5 min (per IP) |
| Abnormal rate | 100 requests/min (suspicious) |
| 404 probing threshold | 10 / 5 min |
| Register rate limit | 25 per min per IP |
| Login rate limit | 10 per min per IP |
| Access token lifetime | 30 min |
| Refresh token lifetime | 7 days |
| Risk levels | 0–29 LOW, 30–59 MEDIUM, 60–79 HIGH, 80–100 CRITICAL |

---

## 5. Tech Stack

- **Backend:** Python 3.11, FastAPI 0.115, SQLAlchemy 2, Pydantic 2, JWT (python-jose), passlib/bcrypt, slowapi, uvicorn, PostgreSQL (prod) / SQLite (local dev)
- **Frontend:** React 18 + Vite 5, React Router, Axios, Recharts, Tailwind CSS
- **Real-time:** WebSocket (`/ws/security`) for live dashboard updates
- **Deploy:** Render (backend + Postgres), Vercel (frontend)

---

## 6. Local Development

### Backend
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env            # then set a SECRET_KEY
uvicorn app.main:app --reload --port 8000
```
- API: `http://localhost:8000` · Docs: `http://localhost:8000/docs`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
- App: `http://localhost:5173` (dev proxy forwards `/api` to `:8000`)

### Full stack via Docker
```bash
docker compose up --build
```

### Run tests
```bash
cd backend
.\.venv\Scripts\python.exe -m pytest tests -q    # 43 tests pass
```

---

## 7. How Deployment Works

1. Code changes are committed and pushed to `main` on GitHub
2. **Render** auto-deploys the backend (installs `requirements.txt`, runs `uvicorn app.main:app` on `$PORT`)
3. **Vercel** auto-builds the frontend (`npm run build`) and serves it
4. The frontend talks to the backend two ways:
   - **Current production build:** same-origin `/api/*` → Vercel rewrite proxies to the Render backend (no CORS dependency)
   - Direct fallback (older bundle): calls the Render URL directly, which is allowed via CORS (the production origin is included in the backend's default CORS allow-list)

---

## 8. Recent Fixes (commits)

| Commit | Change |
|---|---|
| `e9c5f99` | Real-client-IP rate limiting (`X-Forwarded-For`), register limit 5→25/min, same-origin `/api` proxy, production WebSocket URL |
| `3764ab6` | Default CORS now includes `https://sentinelflow-zeta.vercel.app` so the deployed backend works with no env-var setup |

---

## 9. Things to Know Before Demo Day

- Registering >25 accounts in a minute from one IP may return `429` (rate limited).
- Free Render sleep → first load can be slow; warm it up before the demo.
- The seeded admin password is visible in `backend/app/services/seed.py`; fine for a college demo, change it for anything more.
- Delete leftover demo accounts (e.g., `valid@example.com`, `tc102@example.com`, `tcprobe2@example.com`) in the Admin → Users panel if you want a clean demo.

---

## 10. Surviving Unreliable Wi-Fi

The blank dashboard during a previous demo was not a UI bug. Requests had no
timeout, so when the network dropped packets silently the promises never settled
— the loading skeletons could never resolve, and no error state was ever
reachable. A security console that shows nothing is indistinguishable from one
showing no threats, which is the worst possible failure for this project.

What changed:

| Fix | Where | Why |
|---|---|---|
| 15s timeout on every request | `frontend/src/services/api.js` | A hung request now becomes a visible, retryable error instead of an eternal spinner |
| Automatic retry for safe reads | `frontend/src/services/api.js` | GET/HEAD/OPTIONS only — a retried `POST /login` could double-charge or double-register |
| Last-known-good cache | `useAsyncData.js`, `SecurityDashboard.jsx` | A dead network shows the last real numbers, labelled *Stale data*, not an empty grid |
| `data` never cleared on failure | `SecurityDashboard.jsx` | A transient blip can't wipe the screen |
| Render-crash boundary | `ErrorBoundary.jsx` | A render error shows a recovery screen with a Reload button, not a white page |
| Backend warm-up | `useKeepWarm.js` | Pings `/api/health` on load and every 5 min, so the ~45s container wake overlaps with the user filling in the form |
| Scheduled warm-up | `.github/workflows/keep-warm.yml` | Same ping every 8 min while idle. Needs a `BACKEND_HEALTH_URL` repo secret |
| Login returns the profile | `auth.py` / `AuthContext.jsx` | Drops the extra `/me` round trip; the server already had the data |
| bcrypt cost 10 in production | `config.py` / `hashing.py` | ~413ms → ~95ms per login. Dev keeps 12 |
| Fixed dropped containment broadcasts | `routers/response.py` | `await_broadcast()` was called without `await` in sync endpoints, so the coroutine was created and discarded — WARN/BLOCK/UNBLOCK never reached an open dashboard |

Two honest limits worth knowing:

- GitHub's scheduler is best-effort. Jobs can be delayed, and are disabled after
  60 days without repository activity. The browser-side warm-up is the backstop.
- If the platform reports the database as SQLite, everything is stored on a
  throwaway disk and will vanish when the instance sleeps. Check with §11.

### Diagnostics

`GET /api/health/diagnostics` (admin token required) reports whether the
deployment is actually configured correctly. It answers "is the default secret
key in use" and "is the database ephemeral" — never the values themselves.

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://sentinelflow-api-g7p8.onrender.com/api/health/diagnostics
```

Read it like this:

| Field | Healthy | Broken means |
|---|---|---|
| `env` | `production` | `development` → the service thinks it's local |
| `database.kind` | `postgres` | `sqlite` → **data will be lost on sleep** |
| `database.ephemeral` | `false` | `true` → same problem, stated plainly |
| `auth.using_default_secret` | `false` | `true` → anyone can forge an admin token |
| `auth.bcrypt_rounds` | `10`–`12` | — |
| `row_counts.users` | grows over time | stuck at the seed count → data isn't persisting |