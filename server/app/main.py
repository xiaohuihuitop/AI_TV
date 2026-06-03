import threading
import time
from pathlib import Path
from fastapi import Depends, FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from app.api.routes import router as api_router
from app.api.public_routes import router as public_router
from app.core.auth import verify_credentials
from app.core.config import Settings, settings
from app.core.paths import StoragePaths
from app.db.session import get_engine, get_sessionmaker, init_db
from app.tasks.worker import VideoWorker
from app.web.routes import router as web_router


def create_app(settings_override: Settings | None = None) -> FastAPI:
    """AI: 创建 FastAPI 应用实例。
    @param settings_override: 可选配置覆盖。
    @return: FastAPI 应用实例。
    """
    app = FastAPI(title="VideoDoc Admin")
    app.state.settings = settings_override or settings
    cfg = app.state.settings

    storage = StoragePaths(Path(cfg.data_dir))
    storage.ensure_dirs()
    app.state.storage = storage

    engine = get_engine(cfg.db_path)
    init_db(engine)
    SessionLocal = get_sessionmaker(engine)
    app.state.engine = engine
    app.state.session_factory = SessionLocal

    def _loop():
        worker = VideoWorker(session_factory=SessionLocal, storage=storage)
        while True:
            worker.run_once()
            time.sleep(cfg.worker_interval_sec)

    if cfg.enable_worker:
        threading.Thread(target=_loop, daemon=True).start()

    @app.get("/health", dependencies=[Depends(verify_credentials)])
    def health_check():
        """AI: 健康检查接口。
        @return: 固定状态字典。
        """
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
