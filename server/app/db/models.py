from sqlalchemy import Float, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Video(Base):
    """AI: 视频元数据表。
    @return: Video
    """

    __tablename__ = "videos"
    __table_args__ = (Index("ix_videos_status_id", "status", "id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String(255))
    path: Mapped[str] = mapped_column(String(1024))
    cover_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    description: Mapped[str] = mapped_column(String(20), default="无")
    status: Mapped[str] = mapped_column(String(32), default="pending")
    error_message: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[str] = mapped_column(String(32))


class Document(Base):
    """AI: 文档元数据表。
    @return: Document
    """

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String(255))
    path: Mapped[str] = mapped_column(String(1024))
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="ready")
    error_message: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[str] = mapped_column(String(32))


class PhotoAlbum(Base):
    """AI: 相册元数据表。
    @return: PhotoAlbum
    """

    __tablename__ = "photo_albums"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), default="未命名相册")
    description: Mapped[str] = mapped_column(String(2000), default="")
    cover_photo_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="ready")
    error_message: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[str] = mapped_column(String(32))


class Photo(Base):
    """AI: 照片元数据表。
    @return: Photo
    """

    __tablename__ = "photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    album_id: Mapped[int] = mapped_column(Integer, index=True)
    filename: Mapped[str] = mapped_column(String(255))
    path: Mapped[str] = mapped_column(String(1024))
    thumb_path: Mapped[str] = mapped_column(String(1024))
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[str] = mapped_column(String(32))
