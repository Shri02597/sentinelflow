from app.database import SessionLocal
from app.models.product import Product


def _seed_one_product(db):
    p = Product(name="Test Keyboard", description="A keyboard for testing", category="Electronics",
                price=49.99, image=None, stock=10)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _register_and_login(client, email="shopper@example.com", username="shopper", password="ShopperPass123"):
    client.post("/api/auth/register", json={"email": email, "username": username, "password": password})
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]


def test_list_products_empty(client):
    resp = client.get("/api/products")
    assert resp.status_code == 200
    assert resp.json() == []


def test_product_detail_404(client):
    resp = client.get("/api/products/999")
    assert resp.status_code == 404


def test_product_search_and_detail(client):
    db = SessionLocal()
    product = _seed_one_product(db)
    db.close()

    resp = client.get("/api/products/search", params={"q": "Keyboard"})
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["name"] == "Test Keyboard"

    resp = client.get(f"/api/products/{product.id}")
    assert resp.status_code == 200
    assert resp.json()["price"] == 49.99


def test_cart_requires_auth(client):
    resp = client.get("/api/cart")
    assert resp.status_code == 401


def test_add_to_cart_and_view(client):
    db = SessionLocal()
    product = _seed_one_product(db)
    db.close()

    token = _register_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post("/api/cart", json={"product_id": product.id, "quantity": 2}, headers=headers)
    assert resp.status_code == 201
    assert resp.json()["quantity"] == 2

    resp = client.get("/api/cart", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["items"]) == 1
    assert body["total"] == 99.98


def test_add_to_cart_twice_increments_quantity(client):
    db = SessionLocal()
    product = _seed_one_product(db)
    db.close()

    token = _register_and_login(client, email="shopper2@example.com", username="shopper2")
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/cart", json={"product_id": product.id, "quantity": 1}, headers=headers)
    resp = client.post("/api/cart", json={"product_id": product.id, "quantity": 1}, headers=headers)
    assert resp.status_code == 201
    assert resp.json()["quantity"] == 2


def test_remove_from_cart(client):
    db = SessionLocal()
    product = _seed_one_product(db)
    db.close()

    token = _register_and_login(client, email="shopper3@example.com", username="shopper3")
    headers = {"Authorization": f"Bearer {token}"}

    add_resp = client.post("/api/cart", json={"product_id": product.id, "quantity": 1}, headers=headers)
    item_id = add_resp.json()["id"]

    del_resp = client.delete(f"/api/cart/{item_id}", headers=headers)
    assert del_resp.status_code == 204

    resp = client.get("/api/cart", headers=headers)
    assert resp.json()["items"] == []
