from fastapi import Depends, FastAPI

from app.deps import admin_auth
from app.routers.admin import router as admin_router
from app.routers.client import router as client_router

app = FastAPI(title="AI_TV Backend")
app.include_router(admin_router)
app.include_router(client_router)


@app.get("/health")
def health():
    """!
    @brief AI:健康检查接口。
    @return AI:返回服务状态信息。
    """

    return {"status": "ok"}


@app.get("/admin/ping", dependencies=[Depends(admin_auth)])
def admin_ping():
    """!
    @brief AI:管理端连通性检查接口。
    @return AI:返回服务状态信息。
    """

    return {"status": "ok"}
