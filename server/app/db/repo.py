from datetime import datetime
from sqlalchemy.orm import Session
from app.db.models import Document, Photo, PhotoAlbum, Video


def _now_str() -> str:
    """AI: 生成 UTC 时间戳字符串。
    @return: ISO8601 字符串。
    """
    return datetime.utcnow().isoformat()


def create_video(session: Session, filename: str, path: str) -> Video:
    """AI: 创建视频记录。
    @param session: 数据库会话。
    @param filename: 原始文件名。
    @param path: 存储路径。
    @return: Video 实体。
    """
    video = Video(
        filename=filename,
        path=path,
        status="pending",
        created_at=_now_str(),
        description="无",
    )
    session.add(video)
    session.flush()
    session.refresh(video)
    return video


def get_video(session: Session, video_id: int) -> Video | None:
    """AI: 查询视频记录。
    @param session: 数据库会话。
    @param video_id: 主键 ID。
    @return: Video 或 None。
    """
    return session.get(Video, video_id)


def create_document(session: Session, filename: str, path: str, title: str | None) -> Document:
    """AI: 创建文档记录。
    @param session: 数据库会话。
    @param filename: 原始文件名。
    @param path: 存储路径。
    @param title: 文档标题。
    @return: Document 实体。
    """
    doc = Document(filename=filename, path=path, title=title, status="ready", created_at=_now_str())
    session.add(doc)
    session.flush()
    session.refresh(doc)
    return doc


def get_document(session: Session, doc_id: int) -> Document | None:
    """AI: 查询文档记录。
    @param session: 数据库会话。
    @param doc_id: 主键 ID。
    @return: Document 或 None。
    """
    return session.get(Document, doc_id)


def create_photo_album(
    session: Session, title: str | None, description: str | None = None
) -> PhotoAlbum:
    """AI: 创建相册记录。
    @param session: 数据库会话。
    @param title: 相册标题。
    @param description: 相册描述。
    @return: PhotoAlbum 实体。
    """
    album = PhotoAlbum(
        title=(title or "").strip()[:255] or "未命名相册",
        description=(description or "").strip()[:2000],
        status="ready",
        created_at=_now_str(),
    )
    session.add(album)
    session.flush()
    session.refresh(album)
    return album


def list_album_photos(session: Session, album_id: int) -> list[Photo]:
    """AI: 按相册内保存顺序读取照片。"""
    return (
        session.query(Photo)
        .filter(Photo.album_id == album_id)
        .order_by(Photo.position.asc(), Photo.id.asc())
        .all()
    )


def resolve_album_cover(session: Session, album: PhotoAlbum, photos=None) -> Photo | None:
    """AI: 读取相册有效封面；失效封面回退到当前第一张照片。"""
    records = photos if photos is not None else list_album_photos(session, album.id)
    if not records:
        return None
    if album.cover_photo_id is not None:
        selected = next((photo for photo in records if photo.id == album.cover_photo_id), None)
        if selected is not None:
            return selected
    return records[0]


def update_photo_album_metadata(
    session: Session, album: PhotoAlbum, title: str | None, description: str | None
) -> None:
    """AI: 更新相册名称和描述。"""
    album.title = (title or "").strip()[:255] or "未命名相册"
    album.description = (description or "").strip()[:2000]
    session.commit()


def set_photo_album_cover(session: Session, album: PhotoAlbum, photo_id: int) -> Photo:
    """AI: 设置相册封面并校验照片归属。"""
    photo = session.get(Photo, photo_id)
    if not photo or photo.album_id != album.id:
        raise ValueError("照片不属于当前相册")
    album.cover_photo_id = photo.id
    session.commit()
    return photo


def reorder_photo_album(session: Session, album: PhotoAlbum, photo_ids: list[int]) -> list[Photo]:
    """AI: 校验并保存相册照片顺序，位置从零连续编号。"""
    photos = list_album_photos(session, album.id)
    expected = {photo.id for photo in photos}
    received = list(photo_ids)
    if len(received) != len(set(received)) or set(received) != expected:
        raise ValueError("照片顺序必须包含当前相册的全部照片且不能重复")
    by_id = {photo.id: photo for photo in photos}
    ordered = [by_id[photo_id] for photo_id in received]
    for position, photo in enumerate(ordered):
        photo.position = position
    session.commit()
    return ordered


def create_photo(
    session: Session,
    album_id: int,
    filename: str,
    path: str,
    thumb_path: str,
    width: int | None,
    height: int | None,
    size_bytes: int,
    position: int,
) -> Photo:
    """AI: 创建照片记录。
    @param session: 数据库会话。
    @param album_id: 所属相册 ID。
    @param filename: 原始文件名。
    @param path: 原图存储路径。
    @param thumb_path: 展示图存储路径。
    @param width: 宽度。
    @param height: 高度。
    @param size_bytes: 原图字节数。
    @param position: 相册内排序。
    @return: Photo 实体。
    """
    photo = Photo(
        album_id=album_id,
        filename=filename,
        path=path,
        thumb_path=thumb_path,
        width=width,
        height=height,
        size_bytes=size_bytes,
        position=position,
        created_at=_now_str(),
    )
    session.add(photo)
    session.flush()
    session.refresh(photo)
    return photo
