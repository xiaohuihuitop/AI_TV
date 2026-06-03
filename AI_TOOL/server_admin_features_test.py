from pathlib import Path
import atexit
import os
import shutil
import sys
import tempfile
from base64 import b64encode

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
BOOT_DATA_DIR = Path(tempfile.mkdtemp(prefix="ai_tv_server_boot_")) / "data"
os.environ["DATA_DIR"] = str(BOOT_DATA_DIR)
os.environ["DB_PATH"] = str(BOOT_DATA_DIR / "db" / "app.db")
os.environ["ENABLE_WORKER"] = "false"
sys.path.insert(0, str(ROOT / "server"))
os.chdir(ROOT / "server")
atexit.register(lambda: shutil.rmtree(BOOT_DATA_DIR.parent, ignore_errors=True))

from app.core.config import Settings
from app.db.models import Document, Video
from app.db.session import get_engine, get_sessionmaker
from app.main import create_app

AUTH_HEADERS = {"Authorization": "Basic " + b64encode(b"admin:admin").decode("ascii")}


def make_client():
    tmp = Path(tempfile.mkdtemp(prefix="ai_tv_server_test_"))
    data_dir = tmp / "data"
    db_path = data_dir / "db" / "app.db"
    settings = Settings(
        data_dir=str(data_dir),
        db_path=str(db_path),
        basic_user="admin",
        basic_pass="admin",
        worker_interval_sec=3600,
        enable_worker=False,
    )
    app = create_app(settings)
    return tmp, app, TestClient(app)


def cleanup_client(app, tmp):
    engine = getattr(app.state, "engine", None)
    if engine:
        engine.dispose()
    shutil.rmtree(tmp, ignore_errors=True)


def add_video(app, filename, status="ready", description="none"):
    engine = getattr(app.state, "engine", None) or get_engine(app.state.settings.db_path)
    session_maker = get_sessionmaker(engine)
    video_path = Path(app.state.storage.videos) / filename
    video_path.write_bytes(b"video")
    with session_maker() as session:
        video = Video(
            filename=filename,
            path=str(video_path),
            status=status,
            description=description,
            created_at="2026-06-03T00:00:00",
            error_message="probe failed" if status == "failed" else None,
        )
        session.add(video)
        session.commit()
        session.refresh(video)
        return video.id


def add_doc(app, filename):
    engine = getattr(app.state, "engine", None) or get_engine(app.state.settings.db_path)
    session_maker = get_sessionmaker(engine)
    doc_path = Path(app.state.storage.docs) / filename
    doc_path.write_text("hello", encoding="utf-8")
    with session_maker() as session:
        doc = Document(
            filename=filename,
            title=None,
            path=str(doc_path),
            status="ready",
            created_at="2026-06-03T00:00:00",
        )
        session.add(doc)
        session.commit()
        session.refresh(doc)
        return doc.id


def test_status_page_and_api():
    tmp, app, client = make_client()
    try:
        add_video(app, "family.mp4", status="ready")
        add_video(app, "broken.mp4", status="failed")
        add_doc(app, "notice.md")

        api_resp = client.get("/api/system/status", headers=AUTH_HEADERS)
        assert api_resp.status_code == 200
        data = api_resp.json()
        assert data["storage"]["data_dir"]["exists"] is True
        assert data["database"]["exists"] is True
        assert data["counts"]["videos"]["total"] == 2
        assert data["counts"]["videos"]["failed"] == 1
        assert data["counts"]["documents"]["total"] == 1
        assert data["tools"]["ffmpeg"]["available"] in (True, False)

        page_resp = client.get("/web/system", headers=AUTH_HEADERS)
        assert page_resp.status_code == 200
        assert "系统状态" in page_resp.text
        assert str(Path(app.state.settings.data_dir).resolve()) in page_resp.text
    finally:
        cleanup_client(app, tmp)


def test_failed_video_can_be_retried():
    tmp, app, client = make_client()
    try:
        video_id = add_video(app, "broken.mp4", status="failed")

        resp = client.post(
            f"/web/videos/{video_id}/retry",
            headers=AUTH_HEADERS,
            follow_redirects=False,
        )
        assert resp.status_code == 303

        engine = getattr(app.state, "engine", None) or get_engine(app.state.settings.db_path)
        session_maker = get_sessionmaker(engine)
        with session_maker() as session:
            video = session.get(Video, video_id)
            assert video.status == "pending"
            assert video.error_message is None
            assert video.cover_path is None
    finally:
        cleanup_client(app, tmp)


def test_video_list_filters_searches_and_sorts():
    tmp, app, client = make_client()
    try:
        add_video(app, "ready-family.mp4", status="ready")
        add_video(app, "failed-trip.mp4", status="failed")

        filtered = client.get("/web/videos?status=failed", headers=AUTH_HEADERS)
        assert filtered.status_code == 200
        assert "failed-trip.mp4" in filtered.text
        assert "ready-family.mp4" not in filtered.text

        searched = client.get("/web/videos?q=family", headers=AUTH_HEADERS)
        assert searched.status_code == 200
        assert "ready-family.mp4" in searched.text
        assert "failed-trip.mp4" not in searched.text

        api = client.get("/api/videos?status=failed&q=trip&sort=filename", headers=AUTH_HEADERS)
        assert api.status_code == 200
        payload = api.json()
        assert [item["filename"] for item in payload] == ["failed-trip.mp4"]
    finally:
        cleanup_client(app, tmp)


def test_video_bulk_delete_removes_records_and_files():
    tmp, app, client = make_client()
    try:
        first_id = add_video(app, "first.mp4", status="ready")
        second_id = add_video(app, "second.mp4", status="ready")

        resp = client.post(
            "/web/videos/bulk-delete",
            data={"ids": [str(first_id), str(second_id)]},
            headers=AUTH_HEADERS,
            follow_redirects=False,
        )
        assert resp.status_code == 303

        engine = getattr(app.state, "engine", None) or get_engine(app.state.settings.db_path)
        session_maker = get_sessionmaker(engine)
        with session_maker() as session:
            assert session.query(Video).count() == 0
        assert not (Path(app.state.storage.videos) / "first.mp4").exists()
        assert not (Path(app.state.storage.videos) / "second.mp4").exists()
    finally:
        cleanup_client(app, tmp)


def test_doc_list_filters_and_bulk_delete():
    tmp, app, client = make_client()
    try:
        notice_id = add_doc(app, "notice.md")
        guide_id = add_doc(app, "guide.md")

        searched = client.get("/web/docs?q=notice&sort=filename", headers=AUTH_HEADERS)
        assert searched.status_code == 200
        assert "notice.md" in searched.text
        assert "guide.md" not in searched.text

        resp = client.post(
            "/web/docs/bulk-delete",
            data={"ids": [str(notice_id), str(guide_id)]},
            headers=AUTH_HEADERS,
            follow_redirects=False,
        )
        assert resp.status_code == 303

        engine = getattr(app.state, "engine", None) or get_engine(app.state.settings.db_path)
        session_maker = get_sessionmaker(engine)
        with session_maker() as session:
            assert session.query(Document).count() == 0
    finally:
        cleanup_client(app, tmp)


def test_upload_pages_show_progress_controls():
    tmp, app, client = make_client()
    try:
        for path in ("/web/videos", "/web/docs", "/web/upload"):
            resp = client.get(path, headers=AUTH_HEADERS)
            assert resp.status_code == 200
            assert "upload-progress" in resp.text
            assert "XMLHttpRequest" in resp.text
    finally:
        cleanup_client(app, tmp)


if __name__ == "__main__":
    test_status_page_and_api()
    test_failed_video_can_be_retried()
    test_video_list_filters_searches_and_sorts()
    test_video_bulk_delete_removes_records_and_files()
    test_doc_list_filters_and_bulk_delete()
    test_upload_pages_show_progress_controls()
    print("server admin features ok")
