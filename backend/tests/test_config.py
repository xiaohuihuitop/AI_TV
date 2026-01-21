import os
from app.config import Settings


def test_settings_env_override(monkeypatch):
    monkeypatch.setenv("DATA_DIR", "data_x")
    monkeypatch.setenv("DB_PATH", "db_x/app.db")
    monkeypatch.setenv("ADMIN_TOKEN", "token_x")
    settings = Settings()
    assert settings.data_dir == "data_x"
    assert settings.db_path == "db_x/app.db"
    assert settings.admin_token == "token_x"
