import os

from pydantic import BaseModel, Field


class Settings(BaseModel):
    """!
    @brief AI:应用基础配置。
    @note AI:当前支持环境变量覆盖默认值。
    """

    data_dir: str = Field(default_factory=lambda: os.getenv("DATA_DIR", "data"))
    db_path: str = Field(default_factory=lambda: os.getenv("DB_PATH", "db/app.db"))
    admin_token: str = Field(default_factory=lambda: os.getenv("ADMIN_TOKEN", "dev-token"))
