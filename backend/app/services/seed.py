"""
Seeds a small, realistic product catalog for the ShopFlow demo.
Idempotent: only inserts if the products table is empty, so it's safe to
call on every startup.
"""
from app.database import SessionLocal
from app.models.product import Product

DEMO_PRODUCTS = [
    dict(name="Wireless Mechanical Keyboard", description="Hot-swappable switches, per-key RGB, 75% layout.",
         category="Electronics", price=89.99, image="https://picsum.photos/seed/keyboard/400/300", stock=42),
    dict(name="Noise-Cancelling Headphones", description="Over-ear, 30-hour battery, USB-C fast charge.",
         category="Electronics", price=149.00, image="https://picsum.photos/seed/headphones/400/300", stock=30),
    dict(name="4K Webcam", description="Autofocus, wide-angle lens, built-in privacy shutter.",
         category="Electronics", price=59.50, image="https://picsum.photos/seed/webcam/400/300", stock=18),
    dict(name="Ergonomic Office Chair", description="Adjustable lumbar support, breathable mesh back.",
         category="Furniture", price=219.00, image="https://picsum.photos/seed/chair/400/300", stock=12),
    dict(name="Standing Desk Converter", description="Sit-stand riser, gas-spring height adjustment.",
         category="Furniture", price=175.00, image="https://picsum.photos/seed/desk/400/300", stock=15),
    dict(name="Stainless Steel Water Bottle", description="Insulated, 750ml, keeps drinks cold for 24h.",
         category="Lifestyle", price=24.99, image="https://picsum.photos/seed/bottle/400/300", stock=100),
    dict(name="Weighted Blanket", description="7kg, breathable cotton cover, glass bead fill.",
         category="Lifestyle", price=64.00, image="https://picsum.photos/seed/blanket/400/300", stock=25),
    dict(name="Portable Bluetooth Speaker", description="IPX7 waterproof, 20-hour playtime.",
         category="Electronics", price=45.00, image="https://picsum.photos/seed/speaker/400/300", stock=60),
    dict(name="Cast Iron Skillet", description="Pre-seasoned, 12-inch, oven-safe to 500°F.",
         category="Kitchen", price=39.99, image="https://picsum.photos/seed/skillet/400/300", stock=35),
    dict(name="French Press Coffee Maker", description="Borosilicate glass, 1L, stainless steel filter.",
         category="Kitchen", price=29.50, image="https://picsum.photos/seed/frenchpress/400/300", stock=40),
    dict(name="Running Shoes", description="Lightweight mesh upper, responsive foam midsole.",
         category="Apparel", price=79.99, image="https://picsum.photos/seed/shoes/400/300", stock=50),
    dict(name="Merino Wool Sweater", description="Machine washable, breathable, odor-resistant.",
         category="Apparel", price=68.00, image="https://picsum.photos/seed/sweater/400/300", stock=28),
]


from app.models.user import User, UserRole
from app.security.hashing import hash_password


def seed_products():
    db = SessionLocal()
    try:
        if db.query(Product).count() > 0:
            return
        for data in DEMO_PRODUCTS:
            db.add(Product(**data))
        db.commit()
    finally:
        db.close()


def seed_users():
    db = SessionLocal()
    try:
        initial_users = [
            {
                "email": "admin@sentinelflow.io",
                "username": "admin",
                "password": "AdminPassword123!",
                "role": UserRole.ADMIN,
            },
            {
                "email": "analyst@sentinelflow.io",
                "username": "analyst",
                "password": "AnalystPassword123!",
                "role": UserRole.ANALYST,
            },
            {
                "email": "user@sentinelflow.io",
                "username": "demouser",
                "password": "UserPassword123!",
                "role": UserRole.USER,
            },
        ]
        for u_data in initial_users:
            existing = db.query(User).filter(
                (User.email == u_data["email"]) | (User.username == u_data["username"])
            ).first()
            if not existing:
                user = User(
                    email=u_data["email"],
                    username=u_data["username"],
                    hashed_password=hash_password(u_data["password"]),
                    role=u_data["role"],
                    is_active=True,
                )
                db.add(user)
        db.commit()
    finally:
        db.close()

