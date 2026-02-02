from pathlib import Path
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

    def run_once(self) -> None:
        """AI: 执行一次任务处理。
        @return: None
        """
        session: Session = self._session_factory()
        video = session.query(Video).filter(Video.status == "pending").first()
        if not video:
            session.close()
            return
        video.status = "processing"
        session.commit()
        uid = Path(video.path).stem
        cover_path = self._storage.cover_path(uid)
        try:
            info = self._process_func(Path(video.path), cover_path)
            video.width = info["width"]
            video.height = info["height"]
            video.duration_seconds = info["duration"]
            video.cover_path = str(cover_path)
            video.status = "ready"
        except Exception as exc:
            video.status = "failed"
            video.error_message = str(exc)
        session.commit()
        session.close()