from pydantic import BaseModel


class Settings(BaseModel):
    """!
    @brief AI:应用基础配置。
    @note AI:当前仅提供默认值，后续可扩展为环境变量读取。
    """

    data_dir: str = "data"
    db_path: str = "db/app.db"
    admin_token: str = "dev-token"
