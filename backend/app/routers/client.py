from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["client"])


@router.get("/items")
def list_items() -> list:
    """!
    @brief AI:返回客户端内容列表（占位）。
    @return AI:空列表。
    """

    return []


@router.get("/files/{file_id}/stream")
def stream_file(file_id: int) -> dict:
    """!
    @brief AI:根据文件 ID 获取流式内容（占位）。
    @param file_id AI:文件 ID。
    @return AI:抛出未找到错误。
    """

    raise HTTPException(status_code=404, detail="not found")
