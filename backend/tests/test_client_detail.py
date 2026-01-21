from fastapi.testclient import TestClient

from app.main import app


def test_client_list_and_detail(tmp_path, monkeypatch):
    client = TestClient(app)
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("DB_PATH", str(tmp_path / "db" / "app.db"))
    headers = {"Authorization": "Bearer dev-token"}
    client.post("/admin/articles", data={"title": "t", "content": "# hi"}, headers=headers)
    resp = client.get("/items")
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    item_id = resp.json()[0]["id"]
    detail = client.get(f"/items/{item_id}")
    assert detail.status_code == 200
    assert detail.json()["id"] == item_id
    assert "file_id" in detail.json()
