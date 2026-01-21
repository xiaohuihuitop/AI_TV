from fastapi.testclient import TestClient

from app.main import app


def test_client_list_empty():
    client = TestClient(app)
    resp = client.get("/items")
    assert resp.status_code == 200
    assert resp.json() == []
