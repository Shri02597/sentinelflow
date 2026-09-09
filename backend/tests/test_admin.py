from app.database import SessionLocal
from app.models.user import User, UserRole


def _register_and_login(client, email, username, password="Passw0rd123"):
    client.post("/api/auth/register", json={"email": email, "username": username, "password": password})
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]


def _promote(email, role):
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    user.role = role
    db.commit()
    db.close()


def test_regular_user_cannot_access_admin_endpoints(client):
    token = _register_and_login(client, "plain@example.com", "plainuser")
    resp = client.get("/api/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


def test_admin_can_list_and_promote_users(client):
    _register_and_login(client, "boss@example.com", "boss")
    _promote("boss@example.com", UserRole.ADMIN)
    # re-login so the JWT's embedded role claim reflects the promotion, since
    # existing tokens carry the role at issue-time.
    login_resp = client.post("/api/auth/login", json={"email": "boss@example.com", "password": "Passw0rd123"})
    admin_token = login_resp.json()["access_token"]

    _register_and_login(client, "newbie@example.com", "newbie")

    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = client.get("/api/admin/users", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2

    newbie = next(u for u in resp.json() if u["email"] == "newbie@example.com")
    resp = client.patch(f"/api/admin/users/{newbie['id']}/role", json={"role": "ANALYST"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["role"] == "ANALYST"


def test_admin_can_view_and_update_detection_settings(client):
    _register_and_login(client, "root@example.com", "root")
    _promote("root@example.com", UserRole.ADMIN)
    login_resp = client.post("/api/auth/login", json={"email": "root@example.com", "password": "Passw0rd123"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/admin/settings", headers=headers)
    assert resp.status_code == 200
    original = resp.json()["brute_force_max_attempts"]

    resp = client.patch("/api/admin/settings", json={"brute_force_max_attempts": original + 1}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["brute_force_max_attempts"] == original + 1

    # restore so this test doesn't leak state into other tests in the same process
    client.patch("/api/admin/settings", json={"brute_force_max_attempts": original}, headers=headers)
