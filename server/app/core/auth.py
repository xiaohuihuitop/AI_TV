from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

security = HTTPBasic()


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