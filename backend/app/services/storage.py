import hashlib
import os
from datetime import datetime


def save_video(data_dir: str, filename: str, content: bytes) -> dict:
    """!
    @brief AI:保存视频文件并返回基础元数据。
    @param data_dir AI:数据根目录。
    @param filename AI:文件名。
    @param content AI:文件二进制内容。
    @return AI:包含路径、大小、哈希与时间的字典。
    """

    videos_dir = os.path.join(data_dir, "videos")
    os.makedirs(videos_dir, exist_ok=True)
    path = os.path.join(videos_dir, filename)
    with open(path, "wb") as file_handle:
        file_handle.write(content)
    sha256 = hashlib.sha256(content).hexdigest()
    return {
        "path": path,
        "size": len(content),
        "sha256": sha256,
        "created_at": datetime.utcnow().isoformat()
    }


def save_article(data_dir: str, title: str, content: str) -> dict:
    """!
    @brief AI:保存图文 Markdown 并返回基础元数据。
    @param data_dir AI:数据根目录。
    @param title AI:图文标题。
    @param content AI:Markdown 内容。
    @return AI:包含路径、大小、哈希与时间的字典。
    """

    articles_dir = os.path.join(data_dir, "articles")
    os.makedirs(articles_dir, exist_ok=True)
    filename = f"{title}.md"
    path = os.path.join(articles_dir, filename)
    with open(path, "w", encoding="utf-8") as file_handle:
        file_handle.write(content)
    content_bytes = content.encode("utf-8")
    sha256 = hashlib.sha256(content_bytes).hexdigest()
    return {
        "path": path,
        "size": len(content_bytes),
        "sha256": sha256,
        "created_at": datetime.utcnow().isoformat()
    }
