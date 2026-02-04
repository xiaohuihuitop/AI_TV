import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, Header, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from app.core.auth import verify_credentials
from app.core.validators import is_allowed_doc, is_allowed_video
from app.db.models import Document, Video
from app.db.repo import create_document, create_video
from app.db.session import get_engine, get_sessionmaker, init_db
from app.services.range import iter_file, parse_range

router = APIRouter(prefix="/api", dependencies=[Depends(verify_credentials)])


def _get_session(request: Request):
    """AI: 获取数据库会话。
    @param request: 当前请求。
    @return: Session 实例。
    """
    engine = get_engine(request.app.state.settings.db_path)
    init_db(engine)
    SessionLocal = get_sessionmaker(engine)
    return SessionLocal()


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
    for item in files:
        if not is_allowed_video(item.filename, item.content_type):
            raise HTTPException(status_code=400, detail="Only MP4 allowed")

    results: list[dict] = []
    with _get_session(request) as session:
        for item in files:
            uid = str(uuid.uuid4())
            dst = request.app.state.storage.video_path(uid)
            with dst.open("wb") as f:
                f.write(item.file.read())
            video = create_video(session, filename=item.filename, path=str(dst))
            results.append({"id": video.id, "status": video.status})
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
    for item in files:
        if not is_allowed_doc(item.filename, item.content_type):
            raise HTTPException(status_code=400, detail="Only HTML/Markdown allowed")

    results: list[dict] = []
    with _get_session(request) as session:
        for item in files:
            uid = str(uuid.uuid4())
            ext = _resolve_doc_extension(item.filename)
            dst = request.app.state.storage.doc_path(uid, ext)
            with dst.open("wb") as f:
                f.write(item.file.read())
            doc = create_document(session, filename=item.filename, path=str(dst), title=None)
            results.append({"id": doc.id, "status": doc.status})
    if len(results) == 1:
        return results[0]
    return {"count": len(results), "items": results}


@router.get("/videos")
def list_videos(request: Request, status: str | None = None):
    """AI: 获取视频列表。
    @param request: 当前请求。
    @param status: 可选状态筛选。
    @return: 列表数据。
    """
    with _get_session(request) as session:
        query = session.query(Video)
        if status:
            query = query.filter(Video.status == status)
        items = query.order_by(Video.id.desc()).all()
        return [
            {
                "id": v.id,
                "filename": v.filename,
                "status": v.status,
                "duration_seconds": v.duration_seconds,
                "cover_path": v.cover_path,
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
        path = Path(video.path)
        if path.exists():
            path.unlink()
        if video.cover_path:
            cover = Path(video.cover_path)
            if cover.exists():
                cover.unlink()
        session.delete(video)
        session.commit()
        return {"ok": True}


@router.get("/docs")
def list_docs(request: Request):
    """AI: 获取文档列表。
    @param request: 当前请求。
    @return: 列表数据。
    """
    with _get_session(request) as session:
        items = session.query(Document).order_by(Document.id.desc()).all()
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
        path = Path(doc.path)
        if path.exists():
            path.unlink()
        session.delete(doc)
        session.commit()
        return {"ok": True}
