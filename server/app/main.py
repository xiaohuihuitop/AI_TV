import logging
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from app.api.routes import router as api_router
from app.api.public_routes import router as public_router
from app.core.auth import verify_credentials
from app.core.config import Settings, settings
from app.core.csrf import CSRFMiddleware
from app.core.paths import StoragePaths
from app.db.session import get_engine, get_sessionmaker, init_db
from app.tasks.worker import VideoWorker, recover_interrupted_videos
from app.web.routes import router as web_router


logger = logging.getLogger(__name__)


def create_app(settings_override: Settings | None = None) -> FastAPI:
    """AI: 创建 FastAPI 应用实例。
    @param settings_override: 可选配置覆盖。
    @return: FastAPI 应用实例。
    """
    cfg = settings_override or settings

    storage = StoragePaths(Path(cfg.data_dir))
    storage.ensure_dirs()
    engine = get_engine(cfg.db_path, busy_timeout_ms=cfg.sqlite_busy_timeout_ms)
    init_db(engine)
    SessionLocal = get_sessionmaker(engine)
    stop_event = threading.Event()
    worker_thread = None

    @asynccontextmanager
    async def lifespan(app_instance: FastAPI):
        nonlocal worker_thread
        stop_event.clear()
        if cfg.enable_worker:
            recovered = recover_interrupted_videos(SessionLocal)
            if recovered:
                logger.warning("Recovered %s interrupted video task(s)", recovered)
            worker = VideoWorker(session_factory=SessionLocal, storage=storage)

            def _loop():
                while not stop_event.is_set():
                    try:
                        handled = worker.run_once()
                    except Exception:
                        logger.exception("Video worker iteration failed")
                        handled = False
                        try:
                            recover_interrupted_videos(SessionLocal)
                        except Exception:
                            logger.exception("Unable to recover interrupted video tasks")
                    if not handled:
                        stop_event.wait(cfg.worker_interval_sec)

            worker_thread = threading.Thread(target=_loop, daemon=True, name="video-worker")
            worker_thread.start()
            app_instance.state.worker_thread = worker_thread
        try:
            yield
        finally:
            stop_event.set()
            if worker_thread and worker_thread.is_alive():
                worker_thread.join(timeout=max(5, cfg.worker_interval_sec + 1))
            engine.dispose()

    app = FastAPI(title="VideoDoc Admin", lifespan=lifespan)
    app.state.settings = cfg
    app.state.storage = storage
    app.state.engine = engine
    app.state.session_factory = SessionLocal
    app.add_middleware(CSRFMiddleware)

    @app.get("/health", dependencies=[Depends(verify_credentials)])
    def health_check():
        """AI: 健康检查接口。
        @return: 固定状态字典。
        """
        return {"status": "ok"}

    @app.get("/healthz", include_in_schema=False)
    def container_health_check():
        try:
            with engine.connect() as connection:
                connection.exec_driver_sql("SELECT 1")
            if not storage.root.exists() or not storage.root.is_dir():
                raise RuntimeError("data directory is unavailable")
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="unhealthy",
            ) from exc
        return {"status": "ok"}

    @app.get("/")
    def root_redirect():
        """AI: 根路径跳转到 Web 列表页。
        @return: 重定向响应。
        """
        return RedirectResponse(url="/web/videos", status_code=302)

    @app.get("/web")
    def web_root_redirect():
        """AI: /web 路径跳转到 Web 列表页。
        @return: 重定向响应。
        """
        return RedirectResponse(url="/web/videos", status_code=302)

    @app.get("/admin")
    def admin_redirect():
        """AI: /admin 兼容路径，跳转到 Web 列表页。
        @return: 重定向响应。
        """
        return RedirectResponse(url="/web/videos", status_code=302)

    app.mount("/static", StaticFiles(directory="app/static"), name="static")
    app.include_router(api_router)
    app.include_router(public_router)
    app.include_router(web_router)
    return app


app = create_app()
