import os
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["DATABASE_URL"] = "sqlite:///./test_sentinelflow.db"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.utils.rate_limit import limiter

TEST_DB_URL = "sqlite:///./test_sentinelflow.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function", autouse=True)
def setup_db():
    from app.models import user, request_log, security_event, incident, risk_score, product, cart_item  # noqa: F401
    Base.metadata.create_all(bind=engine)
    # Each test gets a fresh rate-limit bucket too — otherwise the login/register
    # limiter (shared, in-memory, keyed by the TestClient's fixed IP) carries
    # a count across every test function in the same pytest run and starts
    # rejecting perfectly normal test traffic with 429s.
    limiter.reset()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)
