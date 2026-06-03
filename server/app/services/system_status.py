import os
import shutil
import subprocess
from pathlib import Path

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Document, Video


def collect_system_status(app, session: Session) -> dict:
    cfg = app.state.settings
    storage = app.state.storage
    db_path = Path(cfg.db_path)
    return {
        "app": {
            "name": "AI TV Server",
            "version": os.getenv("APP_VERSION") or os.getenv("IMAGE_TAG") or "unknown",
            "timezone": os.getenv("TZ", ""),
        },
        "config": {
            "data_dir": cfg.data_dir,
            "db_path": cfg.db_path,
            "basic_user": cfg.basic_user,
            "worker_interval_sec": cfg.worker_interval_sec,
            "enable_worker": cfg.enable_worker,
        },
        "storage": {
            "data_dir": _path_state(Path(cfg.data_dir)),
            "videos": _path_state(storage.videos),
            "covers": _path_state(storage.covers),
            "docs": _path_state(storage.docs),
            "db_dir": _path_state(storage.db),
        },
        "database": _database_state(db_path),
        "counts": _content_counts(session),
        "tools": {
            "ffmpeg": _tool_state("ffmpeg"),
            "ffprobe": _tool_state("ffprobe"),
        },
    }


def _path_state(path: Path) -> dict:
    resolved = path.resolve()
    result = {
        "path": str(resolved),
        "exists": resolved.exists(),
        "is_dir": resolved.is_dir(),
        "writable": False,
        "free_bytes": None,
        "total_bytes": None,
    }
    target = resolved if resolved.is_dir() else resolved.parent
    if target.exists():
        result["writable"] = os.access(target, os.W_OK)
        usage = shutil.disk_usage(target)
        result["free_bytes"] = usage.free
        result["total_bytes"] = usage.total
    return result


def _database_state(path: Path) -> dict:
    resolved = path.resolve()
    return {
        "path": str(resolved),
        "exists": resolved.exists(),
        "size_bytes": resolved.stat().st_size if resolved.exists() else 0,
    }


def _content_counts(session: Session) -> dict:
    video_counts = _status_counts(session, Video)
    doc_counts = _status_counts(session, Document)
    return {
        "videos": {
            "total": session.query(Video).count(),
            "ready": video_counts.get("ready", 0),
            "pending": video_counts.get("pending", 0),
            "processing": video_counts.get("processing", 0),
            "failed": video_counts.get("failed", 0),
        },
        "documents": {
            "total": session.query(Document).count(),
            "ready": doc_counts.get("ready", 0),
            "failed": doc_counts.get("failed", 0),
        },
    }


def _status_counts(session: Session, model) -> dict:
    rows = session.query(model.status, func.count(model.id)).group_by(model.status).all()
    return {status or "unknown": count for status, count in rows}


def _tool_state(name: str) -> dict:
    path = shutil.which(name)
    if not path:
        return {"available": False, "path": "", "version": ""}
    return {"available": True, "path": path, "version": _tool_version(name)}


def _tool_version(name: str) -> str:
    try:
        result = subprocess.run(
            [name, "-version"],
            capture_output=True,
            text=True,
            timeout=3,
            check=False,
        )
    except Exception:
        return ""
    return (result.stdout or result.stderr).splitlines()[0] if result.stdout or result.stderr else ""
