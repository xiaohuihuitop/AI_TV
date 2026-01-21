from fastapi.testclient import TestClient

from app.main import app


def test_client_stream_not_found(tmp_path, monkeypatch):
    client = TestClient(app)
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("DB_PATH", str(tmp_path / "db" / "app.db"))
    resp = client.get("/files/1/stream")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "not found"


def test_client_stream_existing(tmp_path, monkeypatch):
    client = TestClient(app)
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("DB_PATH", str(tmp_path / "db" / "app.db"))
    headers = {"Authorization": "Bearer dev-token"}
    resp = client.post(
        "/admin/videos",
        files={"file": ("a.mp4", b"123", "video/mp4")},
        headers=headers
    )
    file_id = resp.json()["file_id"]
    stream = client.get(f"/files/{file_id}/stream")
    assert stream.status_code == 200
    assert stream.content == b"123"
