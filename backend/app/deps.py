from fastapi import Header, HTTPException

from app.config import Settings


def admin_auth(authorization: str | None = Header(default=None)) -> bool:
    """!
    @brief AI:校验管理端请求的鉴权信息。
    @param authorization AI:HTTP Authorization 头，格式为 Bearer Token。
    @return AI:鉴权通过返回 True。
    """

    settings = Settings()
    if authorization != f"Bearer {settings.admin_token}":
        raise HTTPException(status_code=401, detail="unauthorized")
    return True
