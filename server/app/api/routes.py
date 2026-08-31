from pathlib import Path
from fastapi import APIRouter, Depends, File, Header, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from app.core.auth import verify_credentials
from app.db.models import Document, Video
from app.db.session import get_engine, get_sessionmaker, init_db
from app.services.range import iter_file, parse_range
from app.services.media_delete import delete_document_records, delete_video_records
from app.services.system_status import collect_system_status
from app.services.uploads import UploadError, persist_document_uploads, persist_video_uploads
from app.services.video_tasks import collect_video_tasks

router = APIRouter(prefix="/api", dependencies=[Depends(verify_credentials)])


def _get_session(request: Request):
    """AI: 获取数据库会话。
    @param request: 当前请求。
    @return: Session 实例。
    """
    engine = getattr(request.app.state, "engine", None)
    if not engine:
        engine = get_engine(request.app.state.settings.db_path)
        init_db(engine)
    SessionLocal = getattr(request.app.state, "session_factory", None) or get_sessionmaker(engine)
    return SessionLocal()


def _apply_video_filters(query, status: str | None, q: str | None, sort: str | None):
    if status:
        query = query.filter(Video.status == status)
    if q:
        query = query.filter(Video.filename.ilike(f"%{q.strip()}%"))
    if sort == "filename":
        return query.order_by(Video.filename.asc())
    if sort == "status":
        return query.order_by(Video.status.asc(), Video.id.desc())
    return query.order_by(Video.id.desc())


def _apply_doc_filters(query, q: str | None, sort: str | None):
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(Document.filename.ilike(pattern) | Document.title.ilike(pattern))
    if sort == "filename":
        return query.order_by(Document.filename.asc())
    if sort == "status":
        return query.order_by(Document.status.asc(), Document.id.desc())
    return query.order_by(Document.id.desc())


@router.get("/system/status")
def system_status(request: Request):
    with _get_session(request) as session:
        return collect_system_status(request.app, session)


@router.get("/videos/tasks")
def video_tasks(request: Request):
    with _get_session(request) as session:
        return collect_video_tasks(session)


def _resolve_doc_extension(filename: str) -> str:
    """AI: 解析文档扩展名。
    @param filename: 文件名。
    @return: 扩展名（含点）。
    """
    suffix = Path(filename).suffix.lower()
    return suffix if suffix else ".html"


def _resolve_doc_media_type(path: Path) -> str:
    """AI: 根据路径返回文档媒体类型。
    @param path: 文件路径。
    @return: 媒体类型。
    """
    suffix = path.suffix.lower()
    if suffix in (".md", ".markdown"):
        return "text/markdown"
    return "text/html"

@router.post("/videos")
def upload_video(request: Request, files: list[UploadFile] = File(...)):
    """AI: 上传视频文件。
    @param request: 当前请求。
    @param file: 上传文件。
    @return: 处理状态。
    """
    with _get_session(request) as session:
        try:
            videos = persist_video_uploads(
                session, files, request.app.state.storage, request.app.state.settings
            )
        except UploadError as exc:
            raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
        results = [{"id": video.id, "status": video.status} for video in videos]
    if len(results) == 1:
        return results[0]
    return {"count": len(results), "items": results}


@router.post("/docs")
def upload_doc(request: Request, files: list[UploadFile] = File(...)):
    """AI: 上传文档文件。
    @param request: 当前请求。
    @param file: 上传文件。
    @return: 处理状态。
    """
    with _get_session(request) as session:
        try:
            docs = persist_document_uploads(
                session, files, request.app.state.storage, request.app.state.settings
            )
        except UploadError as exc:
            raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
        results = [{"id": doc.id, "status": doc.status} for doc in docs]
    if len(results) == 1:
        return results[0]
    return {"count": len(results), "items": results}


@router.get("/videos")
def list_videos(request: Request, status: str | None = None, q: str | None = None, sort: str | None = None):
    """AI: 获取视频列表。
    @param request: 当前请求。
    @param status: 可选状态筛选。
    @return: 列表数据。
    """
    with _get_session(request) as session:
        items = _apply_video_filters(session.query(Video), status, q, sort).all()
        return [
            {
                "id": v.id,
                "filename": v.filename,
                "status": v.status,
                "duration_seconds": v.duration_seconds,
                "cover_path": v.cover_path,
                "description": v.description,
            }
            for v in items
        ]


@router.get("/videos/{video_id}")
def get_video_detail(request: Request, video_id: int):
    """AI: 获取视频详情。
    @param request: 当前请求。
    @param video_id: 视频 ID。
    @return: 详情数据。
    """
    with _get_session(request) as session:
        video = session.get(Video, video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Not found")
        return {
            "id": video.id,
            "filename": video.filename,
            "path": video.path,
            "status": video.status,
            "duration_seconds": video.duration_seconds,
            "cover_path": video.cover_path,
            "description": video.description,
        }


@router.get("/videos/{video_id}/download")
def download_video(request: Request, video_id: int, range: str | None = Header(default=None, alias="Range")):
    """AI: 下载视频文件，支持 Range。
    @param request: 当前请求。
    @param video_id: 视频 ID。
    @param range: Range 头。
    @return: 文件响应。
    """
    with _get_session(request) as session:
        video = session.get(Video, video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Not found")
        path = Path(video.path)
        if not path.exists():
            raise HTTPException(status_code=404, detail="File missing")
        if not range:
            return FileResponse(path)
        size = path.stat().st_size
        start, end = parse_range(range, size)
        headers = {
            "Content-Range": f"bytes {start}-{end}/{size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(end - start + 1),
        }
        return StreamingResponse(iter_file(path, start, end), status_code=206, headers=headers)


@router.delete("/videos/{video_id}")
def delete_video(request: Request, video_id: int):
    """AI: 删除视频及封面。
    @param request: 当前请求。
    @param video_id: 视频 ID。
    @return: 操作结果。
    """
    with _get_session(request) as session:
        video = session.get(Video, video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Not found")
        delete_video_records(session, [video])
        return {"ok": True}


@router.get("/docs")
def list_docs(request: Request, q: str | None = None, sort: str | None = None):
    """AI: 获取文档列表。
    @param request: 当前请求。
    @return: 列表数据。
    """
    with _get_session(request) as session:
        items = _apply_doc_filters(session.query(Document), q, sort).all()
        return [{"id": d.id, "filename": d.filename, "status": d.status, "title": d.title} for d in items]


@router.get("/docs/{doc_id}")
def get_doc_detail(request: Request, doc_id: int):
    """AI: 获取文档详情。
    @param request: 当前请求。
    @param doc_id: 文档 ID。
    @return: 详情数据。
    """
    with _get_session(request) as session:
        doc = session.get(Document, doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Not found")
        return {"id": doc.id, "filename": doc.filename, "path": doc.path, "status": doc.status, "title": doc.title}


@router.get("/docs/{doc_id}/download")
def download_doc(request: Request, doc_id: int):
    """AI: 下载文档文件。
    @param request: 当前请求。
    @param doc_id: 文档 ID。
    @return: 文件响应。
    """
    with _get_session(request) as session:
        doc = session.get(Document, doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Not found")
        path = Path(doc.path)
        if not path.exists():
            raise HTTPException(status_code=404, detail="File missing")
        return FileResponse(path, media_type=_resolve_doc_media_type(path))


@router.delete("/docs/{doc_id}")
def delete_doc(request: Request, doc_id: int):
    """AI: 删除文档。
    @param request: 当前请求。
    @param doc_id: 文档 ID。
    @return: 操作结果。
    """
    with _get_session(request) as session:
        doc = session.get(Document, doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Not found")
        delete_document_records(session, [doc])
        return {"ok": True}
