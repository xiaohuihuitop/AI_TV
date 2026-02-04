
def is_allowed_video(filename: str, content_type: str | None) -> bool:
    """AI: 校验视频文件格式。
    @param filename: 文件名。
    @param content_type: MIME。
    @return: 是否允许。
    """
    return filename.lower().endswith(".mp4") and (content_type in (None, "video/mp4", "application/octet-stream"))


def is_allowed_doc(filename: str, content_type: str | None) -> bool:
    """AI: 校验文档文件格式。
    @param filename: 文件名。
    @param content_type: MIME。
    @return: 是否允许。
    """
    lower = filename.lower()
    allowed_ext = (".html", ".htm", ".md", ".markdown")
    allowed_types = (
        None,
        "text/html",
        "text/markdown",
        "text/plain",
        "application/octet-stream",
    )
    return lower.endswith(allowed_ext) and (content_type in allowed_types)
