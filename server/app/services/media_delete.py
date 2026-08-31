import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.db.models import Document, Video


def delete_video_records(session: Session, videos: list[Video]) -> None:
    paths = []
    for video in videos:
        paths.append(Path(video.path))
        if video.cover_path:
            paths.append(Path(video.cover_path))
    _delete_records(session, videos, paths)


def delete_document_records(session: Session, documents: list[Document]) -> None:
    _delete_records(session, documents, [Path(document.path) for document in documents])


def retry_video_record(session: Session, video: Video) -> None:
    paths = [Path(video.cover_path)] if video.cover_path else []
    staged = _stage_existing_files(paths)
    try:
        video.status = "pending"
        video.error_message = None
        video.cover_path = None
        session.commit()
    except Exception:
        session.rollback()
        _restore_staged_files(staged)
        raise
    _remove_staged_files(staged)


def _delete_records(session: Session, records: list, paths: list[Path]) -> None:
    staged = _stage_existing_files(paths)
    try:
        for record in records:
            session.delete(record)
        session.commit()
    except Exception:
        session.rollback()
        _restore_staged_files(staged)
        raise
    _remove_staged_files(staged)


def _stage_existing_files(paths: list[Path]) -> list[tuple[Path, Path]]:
    staged = []
    try:
        for original in paths:
            if not original.exists():
                continue
            temporary = original.with_name(f".{original.name}.{uuid.uuid4().hex}.delete")
            original.replace(temporary)
            staged.append((original, temporary))
        return staged
    except Exception:
        _restore_staged_files(staged)
        raise


def _restore_staged_files(staged: list[tuple[Path, Path]]) -> None:
    for original, temporary in reversed(staged):
        if temporary.exists():
            temporary.replace(original)


def _remove_staged_files(staged: list[tuple[Path, Path]]) -> None:
    for _original, temporary in staged:
        temporary.unlink(missing_ok=True)
