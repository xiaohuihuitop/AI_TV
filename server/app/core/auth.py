from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

security = HTTPBasic()
optional_security = HTTPBasic(auto_error=False)


def verify_credentials(request: Request, credentials: HTTPBasicCredentials = Depends(security)) -> str:
    """AI: 校验 Basic Auth 凭证。
    @param request: 当前请求。
    @param credentials: Basic 凭证。
    @return: 用户名。
    """
    settings = request.app.state.settings
    if credentials.username != settings.basic_user or credentials.password != settings.basic_pass:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username


def verify_public_credentials(
    request: Request, credentials: HTTPBasicCredentials | None = Depends(optional_security)
) -> str:
    """AI: 校验 public 访问凭证，支持 Basic 或查询参数。
    @param request: 当前请求。
    @param credentials: 可选 Basic 凭证。
    @return: 用户名。
    """
    settings = request.app.state.settings
    if credentials and credentials.username == settings.basic_user and credentials.password == settings.basic_pass:
        return credentials.username
    user = request.query_params.get("user")
    password = request.query_params.get("pass")
    if user == settings.basic_user and password == settings.basic_pass:
        return user or ""
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized",
        headers={"WWW-Authenticate": "Basic"},
    )
