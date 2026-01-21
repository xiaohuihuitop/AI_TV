from fastapi import APIRouter

router = APIRouter(tags=["client"])


@router.get("/items")
def list_items() -> list:
    """!
    @brief AI:返回客户端内容列表（占位）。
    @return AI:空列表。
    """

    return []
