import os
import shutil
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.paths import StoragePaths
from app.core.validators import is_allowed_doc, is_allowed_video
from app.db.repo import create_document, create_video


class UploadError(Exception):
    status_code = 400


class InvalidUpload(UploadError):
    status_code = 400


class UploadTooLarge(UploadError):
    status_code = 413


class StorageSpaceLow(UploadError):
    status_code = 507


def save_upload_file(
    upload,
    destination: Path,
    *,
    max_bytes: int,
    chunk_bytes: int,
    reserve_bytes: int,
) -> int:
    """Write one upload in bounded chunks and atomically publish the completed file."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_suffix(f"{destination.suffix}.part")
    _unlink_if_exists(partial)
    total = 0
    try:
        with partial.open("wb") as output:
            while True:
                chunk = upload.file.read(chunk_bytes)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise UploadTooLarge(f"文件超过大小限制：{max_bytes} 字节")
                if reserve_bytes > 0:
                    free_bytes = shutil.disk_usage(destination.parent).free
                    if free_bytes - len(chunk) < reserve_bytes:
                        raise StorageSpaceLow("数据目录剩余空间不足")
                output.write(chunk)
            if total == 0:
                raise InvalidUpload("不能上传空文件")
            output.flush()
            os.fsync(output.fileno())
        partial.replace(destination)
        return total
    except Exception:
        _unlink_if_exists(partial)
        _unlink_if_exists(destination)
        raise


def persist_video_uploads(session: Session, files, storage: StoragePaths, settings):
    uploads = list(files)
    _validate_batch_size(uploads, settings.max_upload_files)
    for upload in uploads:
        if not is_allowed_video(upload.filename or "", upload.content_type):
            raise InvalidUpload("仅允许上传 MP4 视频")

    saved_paths: list[Path] = []
    try:
        records = []
        for upload in uploads:
            destination = storage.video_path(str(uuid.uuid4()))
            save_upload_file(
                upload,
                destination,
                max_bytes=settings.max_video_upload_bytes,
                chunk_bytes=settings.upload_chunk_bytes,
                reserve_bytes=settings.storage_reserve_bytes,
            )
            saved_paths.append(destination)
            records.append(create_video(session, filename=upload.filename, path=str(destination)))
        session.commit()
        return records
    except Exception:
        session.rollback()
        for path in saved_paths:
            _unlink_if_exists(path)
        raise


def persist_document_uploads(session: Session, files, storage: StoragePaths, settings):
    uploads = list(files)
    _validate_batch_size(uploads, settings.max_upload_files)
    for upload in uploads:
        if not is_allowed_doc(upload.filename or "", upload.content_type):
            raise InvalidUpload("仅允许上传 HTML 或 Markdown 文档")

    saved_paths: list[Path] = []
    try:
        records = []
        for upload in uploads:
            suffix = Path(upload.filename or "").suffix.lower() or ".html"
            destination = storage.doc_path(str(uuid.uuid4()), suffix)
            save_upload_file(
                upload,
                destination,
                max_bytes=settings.max_doc_upload_bytes,
                chunk_bytes=settings.upload_chunk_bytes,
                reserve_bytes=settings.storage_reserve_bytes,
            )
            saved_paths.append(destination)
            records.append(
                create_document(session, filename=upload.filename, path=str(destination), title=None)
            )
        session.commit()
        return records
    except Exception:
        session.rollback()
        for path in saved_paths:
            _unlink_if_exists(path)
        raise


def _validate_batch_size(files: list, max_files: int) -> None:
    if not files:
        raise InvalidUpload("至少选择一个文件")
    if len(files) > max_files:
        raise InvalidUpload(f"一次最多上传 {max_files} 个文件")


def _unlink_if_exists(path: Path) -> None:
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass
