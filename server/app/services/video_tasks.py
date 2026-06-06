from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.db.models import Video


ACTIVE_STATUSES = ("pending", "processing")
VISIBLE_STATUSES = ("pending", "processing", "failed")
STATUS_LABELS = {
    "pending": "等待识别",
    "processing": "识别中",
    "ready": "已完成",
    "failed": "识别失败",
}
STATUS_MESSAGES = {
    "pending": "等待后台处理视频信息和封面",
    "processing": "正在识别视频信息和生成封面",
    "ready": "处理完成",
    "failed": "处理失败，请查看错误后重试",
}


def collect_video_tasks(session: Session, limit: int = 8) -> dict:
    counts = _status_counts(session)
    active_count = sum(counts.get(status, 0) for status in ACTIVE_STATUSES)
    items = (
        session.query(Video)
        .filter(Video.status.in_(VISIBLE_STATUSES))
        .order_by(_status_order(), Video.id.desc())
        .limit(limit)
        .all()
    )
    return {
        "counts": {
            "total": session.query(Video).count(),
            "ready": counts.get("ready", 0),
            "pending": counts.get("pending", 0),
            "processing": counts.get("processing", 0),
            "failed": counts.get("failed", 0),
        },
        "active_count": active_count,
        "has_active": active_count > 0,
        "items": [_serialize_video_task(item) for item in items],
    }


def _status_counts(session: Session) -> dict:
    rows = session.query(Video.status, func.count(Video.id)).group_by(Video.status).all()
    return {status or "unknown": count for status, count in rows}


def _status_order():
    return case(
        (Video.status == "processing", 0),
        (Video.status == "pending", 1),
        (Video.status == "failed", 2),
        else_=3,
    )


def _serialize_video_task(video: Video) -> dict:
    status = video.status or "unknown"
    message = video.error_message if status == "failed" and video.error_message else STATUS_MESSAGES.get(status, "")
    return {
        "id": video.id,
        "filename": video.filename,
        "status": status,
        "status_label": STATUS_LABELS.get(status, status),
        "status_class": _status_class(status),
        "message": message,
        "created_at": video.created_at,
        "detail_url": f"/web/videos/{video.id}",
        "retry_url": f"/web/videos/{video.id}/retry" if status == "failed" else "",
    }


def _status_class(status: str) -> str:
    if status == "processing":
        return "task-state-processing"
    if status == "pending":
        return "task-state-pending"
    if status == "failed":
        return "task-state-failed"
    return "task-state-ready"
