from fastapi.testclient import TestClient

from app.main import app


def test_client_stream_not_found():
    client = TestClient(app)
    resp = client.get("/files/1/stream")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "not found"
