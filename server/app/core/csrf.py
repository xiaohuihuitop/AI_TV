import secrets

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware


CSRF_COOKIE_NAME = "ai_tv_csrf"
CSRF_FIELD_NAME = "_csrf_token"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/web"):
            return await call_next(request)
        token = request.cookies.get(CSRF_COOKIE_NAME)
        should_set_cookie = not _looks_like_token(token)
        if should_set_cookie:
            token = secrets.token_urlsafe(32)
        request.state.csrf_token = token
        response = await call_next(request)
        if should_set_cookie:
            response.set_cookie(
                CSRF_COOKIE_NAME,
                token,
                httponly=True,
                samesite="strict",
                secure=bool(request.app.state.settings.csrf_cookie_secure),
                path="/",
            )
        return response


async def verify_csrf(request: Request) -> None:
    if request.method.upper() in SAFE_METHODS:
        return
    expected = request.cookies.get(CSRF_COOKIE_NAME) or ""
    provided = request.headers.get("X-CSRF-Token") or ""
    if not provided:
        content_type = request.headers.get("content-type", "").lower()
        if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
            form = await request.form()
            provided = str(form.get(CSRF_FIELD_NAME) or "")
    if not _looks_like_token(expected) or not secrets.compare_digest(expected, provided):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF validation failed",
        )


def _looks_like_token(value: str | None) -> bool:
    return bool(value and 32 <= len(value) <= 128)
