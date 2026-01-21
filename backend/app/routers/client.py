import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.config import Settings
from app.db import get_file, get_item, list_items
router = APIRouter(tags=["client"])


@router.get("/items")
def list_items_api(type: str | None = None) -> list:
    """!
    @brief AI:返回客户端内容列表。
    @return AI:内容列表。
    """
    settings = Settings()
    return list_items(settings.db_path, type)


@router.get("/items/{item_id}")
def get_item_api(item_id: int) -> dict:
    """!
    @brief AI:返回客户端内容详情。
    @param item_id AI:内容记录 ID。
    @return AI:内容详情字典。
    """

    settings = Settings()
    item = get_item(settings.db_path, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="not found")
    return item


@router.get("/files/{file_id}/stream")
def stream_file(file_id: int) -> dict:
    """!
    @brief AI:根据文件 ID 获取流式内容。
    @param file_id AI:文件 ID。
    @return AI:文件响应。
    """
    settings = Settings()
    file_info = get_file(settings.db_path, file_id)
    if not file_info:
        raise HTTPException(status_code=404, detail="not found")
    if not os.path.exists(file_info["path"]):
        raise HTTPException(status_code=404, detail="not found")
    return FileResponse(file_info["path"], media_type=file_info["mime"])
