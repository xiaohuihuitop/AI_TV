from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


STATIC_CACHE_CONTROL = "no-cache"


class StaticCacheMiddleware(BaseHTTPMiddleware):
    """AI: 静态资源强制协商缓存，避免部署后浏览器沿用旧样式或脚本。"""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/static"):
            response.headers["Cache-Control"] = STATIC_CACHE_CONTROL
        return response
