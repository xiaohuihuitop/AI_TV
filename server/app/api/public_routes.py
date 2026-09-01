from pathlib import Path
from urllib.parse import quote, urlsplit, urlunsplit
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from app.core.auth import verify_public_credentials
from app.db.models import Document, Video
from app.db.session import get_engine, get_sessionmaker, init_db
from app.services.range import iter_file, parse_range

router = APIRouter(prefix="/public", dependencies=[Depends(verify_public_credentials)])


def _get_session(request: Request):
    """AI: 获取数据库会话。
    @param request: 当前请求。
    @return: Session 实例。
    """
    engine = getattr(request.app.state, "engine", None)
    if not engine:
        engine = get_engine(
            request.app.state.settings.db_path,
            busy_timeout_ms=request.app.state.settings.sqlite_busy_timeout_ms,
        )
        init_db(engine)
    SessionLocal = getattr(request.app.state, "session_factory", None) or get_sessionmaker(engine)
    return SessionLocal()


def _build_base_url_with_auth(request: Request, use_query_auth: bool) -> tuple[str, str]:
    """AI: 构建带认证信息的基础 URL。
    @param request: 当前请求。
    @param use_query_auth: 是否使用查询参数认证。
    @return: (base_url, query_suffix)
    """
    settings = request.app.state.settings
    parsed_base_url = urlsplit(str(request.base_url).rstrip("/"))
    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",", 1)[0].strip().lower()
    scheme = forwarded_proto if forwarded_proto in {"http", "https"} else parsed_base_url.scheme
    base_url = urlunsplit((scheme, parsed_base_url.netloc, "", "", "")).rstrip("/")
    if use_query_auth:
        query = f"user={quote(settings.basic_user)}&pass={quote(settings.basic_pass)}"
        return base_url, f"?{query}"
    parsed = urlsplit(base_url)
    netloc = f"{quote(settings.basic_user)}:{quote(settings.basic_pass)}@{parsed.netloc}"
    authed = urlunsplit((parsed.scheme, netloc, "", "", ""))
    return authed, ""


def _make_url(base_url: str, path: str, query_suffix: str) -> str:
    """AI: 拼接完整 URL。
    @param base_url: 基础地址。
    @param path: 路径。
    @param query_suffix: 查询参数。
    @return: 完整 URL。
    """
    safe_path = path if path.startswith("/") else f"/{path}"
    return f"{base_url}{safe_path}{query_suffix}"


def _resolve_doc_format(path: Path) -> str:
    """AI: 根据路径推断文档格式。
    @param path: 文件路径。
    @return: 格式标识（html/markdown）。
    """
    suffix = path.suffix.lower()
    if suffix in (".md", ".markdown"):
        return "markdown"
    return "html"


def _resolve_doc_media_type(path: Path) -> str:
    """AI: 根据路径返回文档媒体类型。
    @param path: 文件路径。
    @return: 媒体类型。
    """
    if _resolve_doc_format(path) == "markdown":
        return "text/markdown"
    return "text/html"


@router.get("/index.json")
def public_index(request: Request):
    """AI: 输出 App 清单协议。
    @param request: 当前请求。
    @return: 清单 JSON。
    """
    use_query_auth = bool(request.query_params.get("user") and request.query_params.get("pass"))
    base_url, query_suffix = _build_base_url_with_auth(request, use_query_auth)
    items: list[dict] = []
    with _get_session(request) as session:
        videos = session.query(Video).filter(Video.status == "ready").order_by(Video.id.desc()).all()
        docs = session.query(Document).order_by(Document.id.desc()).all()
        for video in videos:
            path = Path(video.path)
            if not path.exists():
                continue
            size_bytes = path.stat().st_size
            cover_url = ""
            if video.cover_path:
                cover = Path(video.cover_path)
                if cover.exists():
                    cover_url = _make_url(base_url, f"/public/videos/{video.id}/cover", query_suffix)
            items.append(
                {
                    "id": video.id,
                    "type": "video",
                    "title": video.filename,
                    "url": _make_url(base_url, f"/public/videos/{video.id}/download", query_suffix),
                    "cover": cover_url,
                    "duration_seconds": video.duration_seconds,
                    "size_bytes": size_bytes,
                    "description": video.description or "无",
                    "published_at": video.created_at,
                }
            )
        for doc in docs:
            path = Path(doc.path)
            if not path.exists():
                continue
            doc_format = _resolve_doc_format(path)
            items.append(
                {
                    "id": doc.id,
                    "type": "article",
                    "title": doc.title or doc.filename,
                    "url": _make_url(base_url, f"/public/docs/{doc.id}/download", query_suffix),
                    "format": doc_format,
                    "published_at": doc.created_at,
                }
            )
    return {"items": items}


@router.get("/videos/{video_id}/download")
def public_download_video(
    request: Request, video_id: int, range: str | None = Header(default=None, alias="Range")
):
    """AI: 公开视频下载，支持 Range。
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


@router.get("/videos/{video_id}/cover")
def public_video_cover(request: Request, video_id: int):
    """AI: 输出视频封面。
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


@router.get("/docs/{doc_id}/download")
def public_download_doc(request: Request, doc_id: int):
    """AI: 输出文档文件。
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
