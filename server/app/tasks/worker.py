from pathlib import Path
from sqlalchemy import update
from sqlalchemy.orm import Session
from app.core.paths import StoragePaths
from app.db.models import Video
from app.services.video_processing import process_video


class VideoWorker:
    """AI: 视频后台处理器。
    @return: VideoWorker
    """

    def __init__(self, session_factory, storage: StoragePaths, process_func=process_video):
        """AI: 初始化处理器。
        @param session_factory: Session 工厂。
        @param storage: 存储路径管理器。
        @param process_func: 视频处理函数。
        @return: None
        """
        self._session_factory = session_factory
        self._storage = storage
        self._process_func = process_func

    def run_once(self) -> bool:
        """AI: 执行一次任务处理。
        @return: None
        """
        claimed = self._claim_next()
        if not claimed:
            return False
        video_id, video_path = claimed
        uid = Path(video_path).stem
        cover_path = self._storage.cover_path(uid)
        try:
            info = self._process_func(Path(video_path), cover_path)
        except Exception as exc:
            with self._session_factory() as session:
                video = session.get(Video, video_id)
                if video and video.status == "processing":
                    video.status = "failed"
                    video.error_message = str(exc)[:1024]
                    session.commit()
            return True

        with self._session_factory() as session:
            video = session.get(Video, video_id)
            if not video:
                cover_path.unlink(missing_ok=True)
                return True
            if video.status != "processing":
                return True
            video.width = info["width"]
            video.height = info["height"]
            video.duration_seconds = info["duration"]
            video.cover_path = str(cover_path)
            video.status = "ready"
            video.error_message = None
            session.commit()
        return True

    def _claim_next(self) -> tuple[int, str] | None:
        with self._session_factory() as session:
            candidate = (
                session.query(Video.id, Video.path)
                .filter(Video.status == "pending")
                .order_by(Video.id.asc())
                .first()
            )
            if not candidate:
                return None
            result = session.execute(
                update(Video)
                .where(Video.id == candidate.id, Video.status == "pending")
                .values(status="processing", error_message=None)
            )
            if result.rowcount != 1:
                session.rollback()
                return None
            session.commit()
            return candidate.id, candidate.path


def recover_interrupted_videos(session_factory) -> int:
    """Return tasks interrupted by a process restart to the pending queue."""
    with session_factory() as session:
        result = session.execute(
            update(Video)
            .where(Video.status == "processing")
            .values(status="pending", error_message=None)
        )
        session.commit()
        return int(result.rowcount or 0)
