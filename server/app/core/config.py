from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """AI: 应用配置定义。
    @return: Settings
    """

    data_dir: str = "./data"
    db_path: str = "./data/db/app.db"
    basic_user: str = "admin"
    basic_pass: str = "admin"
    worker_interval_sec: int = 2

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()