import os
import shutil
import threading
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.paths import StoragePaths
from app.core.validators import is_allowed_doc, is_allowed_photo, is_allowed_video
from app.db.repo import create_document, create_photo, create_photo_album, create_video


_reservation_lock = threading.Lock()
_reserved_bytes: dict[int, int] = {}


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
    reservation_key = destination.parent.stat().st_dev
    expected_size = _expected_upload_size(upload, max_bytes)
    reserved_bytes = expected_size if reserve_bytes > 0 else 0
    if reserved_bytes > 0:
        _reserve_upload_space(reservation_key, destination.parent, reserved_bytes, reserve_bytes)
    try:
        with partial.open("wb") as output:
            while True:
                chunk = upload.file.read(chunk_bytes)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise UploadTooLarge(f"文件超过大小限制：{max_bytes} 字节")
                if reserve_bytes > 0 and len(chunk) > reserved_bytes:
                    additional = len(chunk) - reserved_bytes
                    _reserve_upload_space(
                        reservation_key,
                        destination.parent,
                        additional,
                        reserve_bytes,
                    )
                    reserved_bytes += additional
                if reserved_bytes > 0:
                    _write_reserved_chunk(output, chunk, reservation_key)
                    reserved_bytes -= len(chunk)
                else:
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
    finally:
        if reserved_bytes > 0:
            _release_upload_space(reservation_key, reserved_bytes)


def _expected_upload_size(upload, max_bytes: int) -> int:
    raw_size = getattr(upload, "size", None)
    if raw_size is None:
        return max_bytes
    if isinstance(raw_size, bool):
        raise InvalidUpload("文件大小信息无效")
    try:
        size = int(raw_size)
    except (TypeError, ValueError) as error:
        raise InvalidUpload("文件大小信息无效") from error
    if size < 0:
        raise InvalidUpload("文件大小信息无效")
    if size > max_bytes:
        raise UploadTooLarge(f"文件超过大小限制：{max_bytes} 字节")
    return size


def _write_reserved_chunk(output, chunk: bytes, key: int) -> None:
    with _reservation_lock:
        output.write(chunk)
        remaining = max(0, _reserved_bytes.get(key, 0) - len(chunk))
        if remaining:
            _reserved_bytes[key] = remaining
        else:
            _reserved_bytes.pop(key, None)


def _reserve_upload_space(key: int, directory: Path, requested: int, reserve_bytes: int) -> None:
    with _reservation_lock:
        free_bytes = shutil.disk_usage(directory).free
        already_reserved = _reserved_bytes.get(key, 0)
        if free_bytes - already_reserved - requested < reserve_bytes:
            raise StorageSpaceLow("数据目录剩余空间不足")
        _reserved_bytes[key] = already_reserved + requested


def _release_upload_space(key: int, released: int) -> None:
    with _reservation_lock:
        remaining = max(0, _reserved_bytes.get(key, 0) - released)
        if remaining:
            _reserved_bytes[key] = remaining
        else:
            _reserved_bytes.pop(key, None)


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


def _build_photo_thumb(source: Path, destination: Path, max_edge: int = 1920) -> tuple[int, int]:
    """AI: 生成照片展示图（EXIF 转正、长边限制、JPEG 输出）。
    @param source: 原图路径。
    @param destination: 展示图路径。
    @param max_edge: 长边像素上限。
    @return: (宽, 高)。
    """
    from io import BytesIO

    from PIL import Image, ImageOps

    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image)
        width, height = image.size
        image.thumbnail((max_edge, max_edge))
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=85)
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_suffix(".jpg.part")
    _unlink_if_exists(partial)
    try:
        partial.write_bytes(buffer.getvalue())
        partial.replace(destination)
    except Exception:
        _unlink_if_exists(partial)
        _unlink_if_exists(destination)
        raise
    return width, height


def persist_photo_album_uploads(
    session: Session,
    files,
    title: str | None,
    storage: StoragePaths,
    settings,
):
    """AI: 保存一次相册上传（多张照片 + 标题），失败整体回滚并清理文件。
    @param session: 数据库会话。
    @param files: 上传文件列表。
    @param title: 相册标题。
    @param storage: 存储路径管理器。
    @param settings: 应用配置。
    @return: PhotoAlbum 实体。
    """
    uploads = list(files)
    if not uploads:
        raise InvalidUpload("至少选择一张照片")
    if len(uploads) > settings.max_photos_per_album:
        raise InvalidUpload(f"一个相册最多上传 {settings.max_photos_per_album} 张照片")
    for upload in uploads:
        if not is_allowed_photo(upload.filename or "", upload.content_type):
            raise InvalidUpload("仅允许上传 JPG/PNG/WebP 照片")

    saved_paths: list[Path] = []
    try:
        album = create_photo_album(session, title)
        for position, upload in enumerate(uploads):
            suffix = Path(upload.filename or "").suffix.lower() or ".jpg"
            destination = storage.photo_path(str(uuid.uuid4()), suffix)
            save_upload_file(
                upload,
                destination,
                max_bytes=settings.max_photo_upload_bytes,
                chunk_bytes=settings.upload_chunk_bytes,
                reserve_bytes=settings.storage_reserve_bytes,
            )
            saved_paths.append(destination)
            thumb_destination = storage.photo_thumb_path(destination.stem)
            width, height = _build_photo_thumb(destination, thumb_destination)
            saved_paths.append(thumb_destination)
            create_photo(
                session,
                album_id=album.id,
                filename=upload.filename,
                path=str(destination),
                thumb_path=str(thumb_destination),
                width=width,
                height=height,
                size_bytes=destination.stat().st_size,
                position=position,
            )
        session.commit()
        session.refresh(album)
        return album
    except Exception:
        session.rollback()
        for path in saved_paths:
            _unlink_if_exists(path)
        raise


def _unlink_if_exists(path: Path) -> None:
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass
