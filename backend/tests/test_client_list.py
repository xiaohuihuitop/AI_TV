from fastapi.testclient import TestClient

from app.main import app


def test_client_list_empty(tmp_path, monkeypatch):
    client = TestClient(app)
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("DB_PATH", str(tmp_path / "db" / "app.db"))
    resp = client.get("/items")
    assert resp.status_code == 200
    assert resp.json() == []
