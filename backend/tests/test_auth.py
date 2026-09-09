def test_register_and_login(client):
    resp = client.post("/api/auth/register", json={
        "email": "user1@example.com", "username": "user1", "password": "SecurePass123",
    })
    assert resp.status_code == 201
    assert resp.json()["role"] == "USER"

    resp = client.post("/api/auth/login", json={"email": "user1@example.com", "password": "SecurePass123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password_returns_401(client):
    client.post("/api/auth/register", json={
        "email": "user2@example.com", "username": "user2", "password": "SecurePass123",
    })
    resp = client.post("/api/auth/login", json={"email": "user2@example.com", "password": "WrongPass"})
    assert resp.status_code == 401


def test_me_requires_auth(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_duplicate_registration_rejected(client):
    payload = {"email": "dup@example.com", "username": "dupuser", "password": "SecurePass123"}
    first = client.post("/api/auth/register", json=payload)
    assert first.status_code == 201
    second = client.post("/api/auth/register", json=payload)
    assert second.status_code == 400
