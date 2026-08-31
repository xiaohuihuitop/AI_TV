from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
import markdown
from app.core.auth import verify_credentials
from app.core.csrf import verify_csrf
from app.db.models import Document, Video
from app.db.session import get_engine, get_sessionmaker, init_db
from app.services.system_status import collect_system_status
from app.services.uploads import UploadError, persist_document_uploads, persist_video_uploads
from app.services.media_delete import (
    delete_document_records,
    delete_video_records,
    retry_video_record,
)
from app.services.video_tasks import collect_video_tasks

router = APIRouter(
    prefix="/web",
    dependencies=[Depends(verify_credentials), Depends(verify_csrf)],
)
templates = Jinja2Templates(directory="app/templates")


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


def _render_markdown_html(content: str) -> str:
    """AI: 将 Markdown 渲染为 HTML。
    @param content: Markdown 内容。
    @return: HTML 内容。
    """
    return markdown.markdown(
        content or "",
        extensions=[
            "extra",
            "tables",
            "fenced_code",
            "sane_lists",
            "smarty",
        ],
    )

@router.get("/videos", response_class=HTMLResponse)
def videos(
    request: Request,
    status: str | None = None,
    q: str | None = None,
    sort: str | None = None,
    watch: str | None = None,
):
    """AI: 视频列表页。
    @param request: 当前请求。
    @return: HTML 响应。
    """
    with _get_session(request) as session:
        items = _apply_video_filters(session.query(Video), status, q, sort).all()
        task_status = collect_video_tasks(session)
    return templates.TemplateResponse(
        request,
        "videos.html",
        {
            "items": items,
            "active": "videos",
            "filters": {"status": status or "", "q": q or "", "sort": sort or ""},
            "task_status": task_status,
            "watch_processing": watch == "processing",
        },
    )


@router.get("/videos/{video_id}", response_class=HTMLResponse)
def video_detail(request: Request, video_id: int):
    """AI: 视频详情页。
    @param request: 当前请求。
    @param video_id: 视频 ID。
    @return: HTML 响应。
    """
    with _get_session(request) as session:
        video = session.get(Video, video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Not found")
    return templates.TemplateResponse(
        request, "video_detail.html", {"video": video, "active": "videos"}
    )


@router.post("/videos/{video_id}/description")
async def video_description_update(request: Request, video_id: int):
    """AI: 更新视频描述。
    @param request: 当前请求。
    @param video_id: 视频 ID。
    @return: 跳转响应。
    """
    form = await request.form()
    raw = str(form.get("description") or "").strip()
    desc = raw[:20] if raw else "无"
    with _get_session(request) as session:
        video = session.get(Video, video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Not found")
        video.description = desc
        session.commit()
    return RedirectResponse(url=f"/web/videos/{video_id}", status_code=303)


@router.post("/videos/{video_id}/retry")
def video_retry(request: Request, video_id: int):
    with _get_session(request) as session:
        video = session.get(Video, video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Not found")
        retry_video_record(session, video)
    return RedirectResponse(url="/web/videos", status_code=303)

@router.get("/videos/{video_id}/cover")
def video_cover(request: Request, video_id: int):
    """AI: 视频封面输出。
    @param request: 当前请求。
    @param video_id: 视频 ID。
    @return: 文件响应。
    """
    with _get_session(request) as session:
        video = session.get(Video, video_id)
        if not video or not video.cover_path:
            raise HTTPException(status_code=404, detail="Cover missing")
        path = Path(video.cover_path)
        if not path.exists():
            raise HTTPException(status_code=404, detail="Cover missing")
        return FileResponse(path)

@router.post("/videos/{video_id}/delete")
def video_delete(request: Request, video_id: int):
    """AI: Web 删除视频。
    @param request: 当前请求。
    @param video_id: 视频 ID。
    @return: 跳转响应。
    """
    with _get_session(request) as session:
        video = session.get(Video, video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Not found")
        delete_video_records(session, [video])
    return RedirectResponse(url="/web/videos", status_code=303)


@router.post("/videos/bulk-delete")
async def videos_bulk_delete(request: Request):
    form = await request.form()
    ids = [int(item) for item in form.getlist("ids") if str(item).isdigit()]
    with _get_session(request) as session:
        items = session.query(Video).filter(Video.id.in_(ids)).all() if ids else []
        delete_video_records(session, items)
    return RedirectResponse(url="/web/videos", status_code=303)


@router.get("/docs", response_class=HTMLResponse)
def docs(request: Request, q: str | None = None, sort: str | None = None):
    """AI: 文档列表页。
    @param request: 当前请求。
    @return: HTML 响应。
    """
    with _get_session(request) as session:
        items = _apply_doc_filters(session.query(Document), q, sort).all()
    return templates.TemplateResponse(
        request,
        "docs.html",
        {"items": items, "active": "docs", "filters": {"q": q or "", "sort": sort or ""}},
    )


@router.get("/system", response_class=HTMLResponse)
def system_page(request: Request):
    with _get_session(request) as session:
        status = collect_system_status(request.app, session)
    return templates.TemplateResponse(request, "system.html", {"active": "system", "status": status})


@router.get("/docs/{doc_id}", response_class=HTMLResponse)
def doc_detail(request: Request, doc_id: int):
    """AI: 文档详情页。
    @param request: 当前请求。
    @param doc_id: 文档 ID。
    @return: HTML 响应。
    """
    with _get_session(request) as session:
        doc = session.get(Document, doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Not found")
    return templates.TemplateResponse(request, "doc_detail.html", {"doc": doc, "active": "docs"})


@router.post("/docs/{doc_id}/delete")
def doc_delete(request: Request, doc_id: int):
    """AI: Web 删除文档。
    @param request: 当前请求。
    @param doc_id: 文档 ID。
    @return: 跳转响应。
    """
    with _get_session(request) as session:
        doc = session.get(Document, doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Not found")
        delete_document_records(session, [doc])
    return RedirectResponse(url="/web/docs", status_code=303)


@router.post("/docs/bulk-delete")
async def docs_bulk_delete(request: Request):
    form = await request.form()
    ids = [int(item) for item in form.getlist("ids") if str(item).isdigit()]
    with _get_session(request) as session:
        items = session.query(Document).filter(Document.id.in_(ids)).all() if ids else []
        delete_document_records(session, items)
    return RedirectResponse(url="/web/docs", status_code=303)


@router.get("/docs/{doc_id}/preview")
def doc_preview(request: Request, doc_id: int):
    """AI: 文档预览文件输出。
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
        if path.suffix.lower() in (".md", ".markdown"):
            content = path.read_text(encoding="utf-8", errors="ignore")
            html = _render_markdown_html(content)
            title = doc.title or doc.filename
            return templates.TemplateResponse(
                request,
                "doc_preview_markdown.html",
                {"content": html, "title": title, "active": "docs"},
            )
        return FileResponse(path, media_type=_resolve_doc_media_type(path))


@router.get("/upload", response_class=HTMLResponse)
def upload_page(request: Request):
    """AI: 上传页面。
    @param request: 当前请求。
    @return: HTML 响应。
    """
    return templates.TemplateResponse(request, "upload.html", {"active": ""})


@router.post("/upload/video")
def upload_video(request: Request, files: list[UploadFile] = File(...)):
    """AI: Web 上传视频。
    @param request: 当前请求。
    @param file: 上传文件。
    @return: 跳转响应。
    """
    with _get_session(request) as session:
        try:
            persist_video_uploads(
                session, files, request.app.state.storage, request.app.state.settings
            )
        except UploadError as exc:
            raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return RedirectResponse(url="/web/videos", status_code=303)


@router.post("/upload/doc")
def upload_doc(request: Request, files: list[UploadFile] = File(...)):
    """AI: Web 上传文档。
    @param request: 当前请求。
    @param file: 上传文件。
    @return: 跳转响应。
    """
    with _get_session(request) as session:
        try:
            persist_document_uploads(
                session, files, request.app.state.storage, request.app.state.settings
            )
        except UploadError as exc:
            raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return RedirectResponse(url="/web/docs", status_code=303)
