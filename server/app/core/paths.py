from pathlib import Path


class StoragePaths:
    """AI: 存储路径管理器。
    @return: StoragePaths
    """

    def __init__(self, root: Path):
        """AI: 初始化存储路径。
        @param root: 根目录。
        @return: None
        """
        self.root = root
        self.videos = root / "videos"
        self.covers = root / "covers"
        self.docs = root / "docs"
        self.db = root / "db"

    def ensure_dirs(self) -> None:
        """AI: 确保存储目录存在。
        @return: None
        """
        self.videos.mkdir(parents=True, exist_ok=True)
        self.covers.mkdir(parents=True, exist_ok=True)
        self.docs.mkdir(parents=True, exist_ok=True)
        self.db.mkdir(parents=True, exist_ok=True)

    def video_path(self, uid: str) -> Path:
        """AI: 生成视频文件路径。
        @param uid: 唯一 ID。
        @return: 视频路径。
        """
        return self.videos / f"{uid}.mp4"

    def doc_path(self, uid: str, ext: str = ".html") -> Path:
        """AI: 生成文档文件路径。
        @param uid: 唯一 ID。
        @param ext: 文件扩展名（含点）。
        @return: 文档路径。
        """
        suffix = ext if ext.startswith(".") else f".{ext}"
        return self.docs / f"{uid}{suffix}"

    def cover_path(self, uid: str) -> Path:
        """AI: 生成封面图片路径。
        @param uid: 唯一 ID。
        @return: 封面路径。
        """
        return self.covers / f"{uid}.jpg"
