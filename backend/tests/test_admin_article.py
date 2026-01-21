from fastapi.testclient import TestClient

from app.main import app


def test_admin_import_article(tmp_path, monkeypatch):
    client = TestClient(app)
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("DB_PATH", str(tmp_path / "db" / "app.db"))
    headers = {"Authorization": "Bearer dev-token"}
    resp = client.post(
        "/admin/articles",
        data={"title": "t", "content": "# hi"},
        headers=headers
    )
    assert resp.status_code == 200
    assert resp.json()["type"] == "article"
    assert resp.json()["item_id"] > 0
    assert resp.json()["file_id"] > 0
