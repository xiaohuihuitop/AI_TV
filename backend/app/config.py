import os

from pydantic import BaseModel, Field


class Settings(BaseModel):
    """!
    @brief AI:应用基础配置。
    @note AI:当前仅提供默认值，后续可扩展为环境变量读取。
    """

    data_dir: str = Field(default_factory=lambda: os.getenv("DATA_DIR", "data"))
    db_path: str = Field(default_factory=lambda: os.getenv("DB_PATH", "db/app.db"))
    admin_token: str = Field(default_factory=lambda: os.getenv("ADMIN_TOKEN", "dev-token"))
