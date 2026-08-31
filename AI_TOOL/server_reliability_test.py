import atexit
import io
import os
import shutil
import sqlite3
import sys
import tempfile
from base64 import b64encode
from contextlib import closing
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient


ROOT = Path(__file__).resolve().parents[1]
BOOT_ROOT = Path(tempfile.mkdtemp(prefix="ai_tv_reliability_boot_"))
os.environ["DATA_DIR"] = str(BOOT_ROOT / "data")
os.environ["DB_PATH"] = str(BOOT_ROOT / "data" / "db" / "app.db")
os.environ["ENABLE_WORKER"] = "false"
sys.path.insert(0, str(ROOT / "server"))
os.chdir(ROOT / "server")
atexit.register(lambda: shutil.rmtree(BOOT_ROOT, ignore_errors=True))

from app.core.config import Settings
from app.core.paths import StoragePaths
from app.db.models import Video
from app.db.session import get_engine, get_sessionmaker, init_db
from app.main import create_app
from app.services.uploads import (
    InvalidUpload,
    StorageSpaceLow,
    UploadTooLarge,
    persist_video_uploads,
    save_upload_file,
)


AUTH_HEADERS = {"Authorization": "Basic " + b64encode(b"admin:admin").decode("ascii")}


class RecordingFile(io.BytesIO):
    def __init__(self, content: bytes):
        super().__init__(content)
        self.read_sizes = []

    def read(self, size=-1):
        self.read_sizes.append(size)
        return super().read(size)


class FakeUpload:
    def __init__(self, filename: str, content: bytes, content_type: str):
        self.filename = filename
        self.content_type = content_type
        self.file = RecordingFile(content)


def make_settings(root: Path, **overrides):
    values = {
        "data_dir": str(root / "data"),
        "db_path": str(root / "data" / "db" / "app.db"),
        "basic_user": "admin",
        "basic_pass": "admin",
        "worker_interval_sec": 1,
        "enable_worker": False,
        "max_video_upload_bytes": 32,
        "max_doc_upload_bytes": 16,
        "max_upload_files": 4,
        "upload_chunk_bytes": 64 * 1024,
        "storage_reserve_bytes": 0,
        "sqlite_busy_timeout_ms": 5000,
    }
    values.update(overrides)
    return Settings(**values)


def make_database(root: Path):
    settings = make_settings(root)
    storage = StoragePaths(Path(settings.data_dir))
    storage.ensure_dirs()
    engine = get_engine(settings.db_path)
    init_db(engine)
    return settings, storage, engine, get_sessionmaker(engine)


def add_video(session_factory, path: Path, status: str):
    with session_factory() as session:
        video = Video(
            filename=path.name,
            path=str(path),
            status=status,
            description="无",
            created_at="2026-08-30T00:00:00",
        )
        session.add(video)
        session.commit()
        session.refresh(video)
        return video.id


def test_upload_file_is_chunked_and_atomic():
    root = Path(tempfile.mkdtemp(prefix="ai_tv_upload_chunk_"))
    try:
        upload = FakeUpload("video.mp4", b"1234567", "video/mp4")
        destination = root / "video.mp4"
        size = save_upload_file(upload, destination, max_bytes=10, chunk_bytes=3, reserve_bytes=0)
        assert size == 7
        assert destination.read_bytes() == b"1234567"
        assert upload.file.read_sizes == [3, 3, 3, 3]
        assert not destination.with_suffix(".mp4.part").exists()
    finally:
        shutil.rmtree(root, ignore_errors=True)


def test_upload_limit_removes_partial_file():
    root = Path(tempfile.mkdtemp(prefix="ai_tv_upload_limit_"))
    try:
        upload = FakeUpload("video.mp4", b"1234567", "video/mp4")
        destination = root / "video.mp4"
        try:
            save_upload_file(upload, destination, max_bytes=5, chunk_bytes=3, reserve_bytes=0)
            raise AssertionError("expected UploadTooLarge")
        except UploadTooLarge:
            pass
        assert not destination.exists()
        assert not destination.with_suffix(".mp4.part").exists()
    finally:
        shutil.rmtree(root, ignore_errors=True)


def test_upload_respects_storage_reserve():
    root = Path(tempfile.mkdtemp(prefix="ai_tv_upload_reserve_"))
    try:
        upload = FakeUpload("video.mp4", b"123", "video/mp4")
        destination = root / "video.mp4"
        with patch(
            "app.services.uploads.shutil.disk_usage",
            return_value=SimpleNamespace(free=5),
        ):
            try:
                save_upload_file(
                    upload,
                    destination,
                    max_bytes=10,
                    chunk_bytes=3,
                    reserve_bytes=4,
                )
                raise AssertionError("expected StorageSpaceLow")
            except StorageSpaceLow:
                pass
        assert not destination.exists()
        assert not destination.with_suffix(".mp4.part").exists()
    finally:
        shutil.rmtree(root, ignore_errors=True)


def test_upload_rejects_oversized_batch_before_writing():
    root = Path(tempfile.mkdtemp(prefix="ai_tv_upload_batch_limit_"))
    settings, storage, engine, session_factory = make_database(root)
    settings.max_upload_files = 1
    try:
        files = [
            FakeUpload("first.mp4", b"1", "video/mp4"),
            FakeUpload("second.mp4", b"2", "video/mp4"),
        ]
        with session_factory() as session:
            try:
                persist_video_uploads(session, files, storage, settings)
                raise AssertionError("expected InvalidUpload")
            except InvalidUpload:
                pass
        with session_factory() as session:
            assert session.query(Video).count() == 0
        assert list(storage.videos.iterdir()) == []
    finally:
        engine.dispose()
        shutil.rmtree(root, ignore_errors=True)


def test_upload_batch_rolls_back_database_and_files():
    root = Path(tempfile.mkdtemp(prefix="ai_tv_upload_batch_"))
    settings, storage, engine, session_factory = make_database(root)
    settings.max_video_upload_bytes = 5
    try:
        files = [
            FakeUpload("first.mp4", b"1234", "video/mp4"),
            FakeUpload("second.mp4", b"123456", "video/mp4"),
        ]
        with session_factory() as session:
            try:
                persist_video_uploads(session, files, storage, settings)
                raise AssertionError("expected UploadTooLarge")
            except UploadTooLarge:
                pass
        with session_factory() as session:
            assert session.query(Video).count() == 0
        assert list(storage.videos.iterdir()) == []
    finally:
        engine.dispose()
        shutil.rmtree(root, ignore_errors=True)


def test_delete_restores_files_when_database_commit_fails():
    from sqlalchemy import event

    from app.services.media_delete import delete_video_records

    root = Path(tempfile.mkdtemp(prefix="ai_tv_delete_rollback_"))
    _, storage, engine, session_factory = make_database(root)
    video_path = storage.video_path("delete")
    cover_path = storage.cover_path("delete")
    video_path.write_bytes(b"video")
    cover_path.write_bytes(b"cover")
    video_id = add_video(session_factory, video_path, "ready")
    try:
        with session_factory() as session:
            video = session.get(Video, video_id)
            video.cover_path = str(cover_path)
            session.commit()

        with session_factory() as session:
            video = session.get(Video, video_id)

            @event.listens_for(session, "before_commit", once=True)
            def fail_commit(_session):
                raise RuntimeError("commit failed")

            try:
                delete_video_records(session, [video])
                raise AssertionError("expected commit failure")
            except RuntimeError as exc:
                assert str(exc) == "commit failed"

        assert video_path.exists()
        assert cover_path.exists()
        with session_factory() as session:
            assert session.get(Video, video_id) is not None
    finally:
        engine.dispose()
        shutil.rmtree(root, ignore_errors=True)


def test_worker_recovers_and_records_failures():
    from app.tasks.worker import VideoWorker, recover_interrupted_videos

    root = Path(tempfile.mkdtemp(prefix="ai_tv_worker_"))
    _, storage, engine, session_factory = make_database(root)
    video_path = storage.video_path("broken")
    video_path.write_bytes(b"not-video")
    video_id = add_video(session_factory, video_path, "processing")
    try:
        assert recover_interrupted_videos(session_factory) == 1
        with session_factory() as session:
            assert session.get(Video, video_id).status == "pending"

        def fail_processing(path, cover_path):
            raise RuntimeError("probe failed")

        worker = VideoWorker(session_factory, storage, process_func=fail_processing)
        assert worker.run_once() is True
        assert worker.run_once() is False
        with session_factory() as session:
            video = session.get(Video, video_id)
            assert video.status == "failed"
            assert video.error_message == "probe failed"
    finally:
        engine.dispose()
        shutil.rmtree(root, ignore_errors=True)


def test_worker_discards_cover_when_record_is_deleted_during_processing():
    from app.tasks.worker import VideoWorker

    root = Path(tempfile.mkdtemp(prefix="ai_tv_worker_delete_"))
    _, storage, engine, session_factory = make_database(root)
    video_path = storage.video_path("deleted-during-processing")
    video_path.write_bytes(b"video")
    video_id = add_video(session_factory, video_path, "pending")

    def delete_during_processing(_path, cover_path):
        cover_path.write_bytes(b"cover")
        with session_factory() as session:
            video = session.get(Video, video_id)
            session.delete(video)
            session.commit()
        return {"width": 1, "height": 1, "duration": 1.0}

    try:
        worker = VideoWorker(session_factory, storage, process_func=delete_during_processing)
        assert worker.run_once() is True
        assert not storage.cover_path("deleted-during-processing").exists()
        with session_factory() as session:
            assert session.get(Video, video_id) is None
    finally:
        engine.dispose()
        shutil.rmtree(root, ignore_errors=True)


def test_sqlite_uses_wal_busy_timeout_and_migration_versions():
    root = Path(tempfile.mkdtemp(prefix="ai_tv_sqlite_"))
    settings, _, engine, _ = make_database(root)
    try:
        with engine.connect() as conn:
            assert conn.exec_driver_sql("PRAGMA journal_mode").scalar().lower() == "wal"
            assert conn.exec_driver_sql("PRAGMA busy_timeout").scalar() >= settings.sqlite_busy_timeout_ms
            versions = conn.exec_driver_sql(
                "SELECT version FROM schema_migrations ORDER BY version"
            ).scalars().all()
            assert versions == [1]
    finally:
        engine.dispose()
        shutil.rmtree(root, ignore_errors=True)


def test_database_backup_and_restore_preserve_data():
    from app.services.database_backup import backup_database, restore_database

    root = Path(tempfile.mkdtemp(prefix="ai_tv_backup_"))
    settings, storage, engine, session_factory = make_database(root)
    video_path = storage.video_path("backup")
    video_path.write_bytes(b"video")
    add_video(session_factory, video_path, "ready")
    backup_path = root / "backups" / "app.db"
    restored_path = root / "restore" / "app.db"
    try:
        backup_database(Path(settings.db_path), backup_path)
        with closing(sqlite3.connect(backup_path)) as conn:
            assert conn.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
            assert conn.execute("SELECT COUNT(*) FROM videos").fetchone()[0] == 1
        restored_path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(restored_path)) as conn:
            conn.execute("CREATE TABLE previous_data(value TEXT)")
            conn.execute("INSERT INTO previous_data(value) VALUES ('before restore')")
            conn.commit()
        restored_backup = restore_database(backup_path, restored_path)
        assert restored_backup is not None and restored_backup.is_file()
        with closing(sqlite3.connect(restored_backup)) as conn:
            assert conn.execute("SELECT value FROM previous_data").fetchone()[0] == "before restore"
        with closing(sqlite3.connect(restored_path)) as conn:
            assert conn.execute("SELECT COUNT(*) FROM videos").fetchone()[0] == 1
    finally:
        engine.dispose()
        shutil.rmtree(root, ignore_errors=True)


def test_web_post_requires_csrf_token():
    root = Path(tempfile.mkdtemp(prefix="ai_tv_csrf_"))
    settings = make_settings(root)
    app = create_app(settings)
    try:
        video_path = app.state.storage.video_path("csrf")
        video_path.write_bytes(b"video")
        video_id = add_video(app.state.session_factory, video_path, "failed")
        with TestClient(app) as client:
            health = client.get("/healthz")
            assert health.status_code == 200
            assert health.json() == {"status": "ok"}
            blocked = client.post(
                f"/web/videos/{video_id}/retry",
                headers=AUTH_HEADERS,
                follow_redirects=False,
            )
            assert blocked.status_code == 403

            page = client.get("/web/videos", headers=AUTH_HEADERS)
            assert page.status_code == 200
            token = client.cookies.get("ai_tv_csrf")
            assert token
            allowed = client.post(
                f"/web/videos/{video_id}/retry",
                headers={**AUTH_HEADERS, "X-CSRF-Token": token},
                follow_redirects=False,
            )
            assert allowed.status_code == 303
    finally:
        app.state.engine.dispose()
        shutil.rmtree(root, ignore_errors=True)


def test_upload_endpoint_enforces_limit_without_leaving_files():
    root = Path(tempfile.mkdtemp(prefix="ai_tv_upload_endpoint_"))
    settings = make_settings(root, max_video_upload_bytes=5)
    app = create_app(settings)
    try:
        with TestClient(app) as client:
            rejected = client.post(
                "/api/videos",
                headers=AUTH_HEADERS,
                files={"files": ("large.mp4", b"123456", "video/mp4")},
            )
            assert rejected.status_code == 413
            assert list(app.state.storage.videos.iterdir()) == []

            accepted = client.post(
                "/api/videos",
                headers=AUTH_HEADERS,
                files={"files": ("small.mp4", b"1234", "video/mp4")},
            )
            assert accepted.status_code == 200
            with app.state.session_factory() as session:
                videos = session.query(Video).all()
                assert len(videos) == 1
                assert Path(videos[0].path).read_bytes() == b"1234"
    finally:
        app.state.engine.dispose()
        shutil.rmtree(root, ignore_errors=True)


def test_docker_runtime_is_hardened():
    dockerfile = (ROOT / "server" / "Dockerfile").read_text(encoding="utf-8")
    entrypoint = (ROOT / "server" / "docker-entrypoint.sh").read_text(encoding="utf-8")
    compose = (ROOT / "server" / "docker-compose.yml").read_text(encoding="utf-8")
    assert "gosu" in dockerfile
    assert "exec gosu app" in entrypoint
    assert "HEALTHCHECK" in dockerfile
    assert "TMPDIR=/data/tmp" in dockerfile
    assert "init: true" in compose
    assert "stop_grace_period:" in compose
    assert "read_only: true" in compose
    assert "MAX_VIDEO_UPLOAD_BYTES" in compose


if __name__ == "__main__":
    test_upload_file_is_chunked_and_atomic()
    test_upload_limit_removes_partial_file()
    test_upload_respects_storage_reserve()
    test_upload_rejects_oversized_batch_before_writing()
    test_upload_batch_rolls_back_database_and_files()
    test_delete_restores_files_when_database_commit_fails()
    test_worker_recovers_and_records_failures()
    test_worker_discards_cover_when_record_is_deleted_during_processing()
    test_sqlite_uses_wal_busy_timeout_and_migration_versions()
    test_database_backup_and_restore_preserve_data()
    test_web_post_requires_csrf_token()
    test_upload_endpoint_enforces_limit_without_leaving_files()
    test_docker_runtime_is_hardened()
    print("server reliability tests ok")
