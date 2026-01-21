from fastapi.testclient import TestClient

from app.main import app


def test_admin_upload_video(tmp_path, monkeypatch):
    client = TestClient(app)
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("DB_PATH", str(tmp_path / "db" / "app.db"))
    files = {"file": ("a.mp4", b"123", "video/mp4")}
    headers = {"Authorization": "Bearer dev-token"}
    resp = client.post("/admin/videos", files=files, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["type"] == "video"
    assert resp.json()["item_id"] > 0
    assert resp.json()["file_id"] > 0
