from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.config import Settings
from app.deps import admin_auth
from app.db import create_file, create_item, delete_item
from app.services.storage import save_article, save_video

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
    item_id = create_item(settings.db_path, "video", file.filename)
    file_id = create_file(
        settings.db_path,
        item_id,
        info["path"],
        info["size"],
        info["sha256"],
        file.content_type or "video/mp4"
    )
    return {"type": "video", "path": info["path"], "item_id": item_id, "file_id": file_id}


@router.post("/articles", dependencies=[Depends(admin_auth)])
def import_article(title: str = Form(...), content: str = Form(...)) -> dict:
    """!
    @brief AI:导入图文内容并保存为 Markdown。
    @param title AI:图文标题。
    @param content AI:Markdown 内容。
    @return AI:包含类型与保存路径的结果。
    """

    settings = Settings()
    info = save_article(settings.data_dir, title, content)
    item_id = create_item(settings.db_path, "article", title)
    file_id = create_file(
        settings.db_path,
        item_id,
        info["path"],
        info["size"],
        info["sha256"],
        "text/markdown"
    )
    return {"type": "article", "path": info["path"], "item_id": item_id, "file_id": file_id}


@router.delete("/items/{item_id}", dependencies=[Depends(admin_auth)])
def remove_item(item_id: int) -> dict:
    """!
    @brief AI:删除指定内容记录。
    @param item_id AI:内容记录 ID。
    @return AI:删除结果状态。
    """

    settings = Settings()
    ok = delete_item(settings.db_path, item_id)
    if not ok:
        raise HTTPException(status_code=404, detail="not found")
    return {"status": "deleted"}
