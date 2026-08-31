from datetime import datetime
from sqlalchemy.orm import Session
from app.db.models import Document, Video


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
