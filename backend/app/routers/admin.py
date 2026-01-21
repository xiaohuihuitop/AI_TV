from fastapi import APIRouter, Depends, File, UploadFile

from app.config import Settings
from app.deps import admin_auth
from app.services.storage import save_video

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/videos", dependencies=[Depends(admin_auth)])
def upload_video(file: UploadFile = File(...)) -> dict:
    """!
    @brief AI:上传视频并保存到本地。
    @param file AI:上传的 mp4 文件。
    @return AI:包含类型与保存路径的结果。
    """

    settings = Settings()
    data = file.file.read()
    info = save_video(settings.data_dir, file.filename, data)
    return {"type": "video", "path": info["path"]}
