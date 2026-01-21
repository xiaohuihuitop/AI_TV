from fastapi.testclient import TestClient

from app.main import app


def test_admin_requires_token():
    client = TestClient(app)
    resp = client.get("/admin/ping")
    assert resp.status_code == 401
