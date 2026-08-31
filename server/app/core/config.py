from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """AI: 应用配置定义。
    @return: Settings
    """

    data_dir: str = "./data"
    db_path: str = "./data/db/app.db"
    basic_user: str = "admin"
    basic_pass: str = "admin"
    worker_interval_sec: int = Field(default=2, ge=1)
    enable_worker: bool = True
    max_video_upload_bytes: int = Field(default=2 * 1024 * 1024 * 1024, ge=1)
    max_doc_upload_bytes: int = Field(default=20 * 1024 * 1024, ge=1)
    max_upload_files: int = Field(default=10, ge=1, le=100)
    upload_chunk_bytes: int = Field(default=1024 * 1024, ge=64 * 1024)
    storage_reserve_bytes: int = Field(default=128 * 1024 * 1024, ge=0)
    sqlite_busy_timeout_ms: int = Field(default=5000, ge=1000)
    csrf_cookie_secure: bool = False

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
