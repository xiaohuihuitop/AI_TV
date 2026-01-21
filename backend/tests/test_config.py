from app.config import Settings


def test_settings_defaults():
    settings = Settings()
    assert settings.data_dir == "data"
    assert settings.db_path == "db/app.db"
    assert settings.admin_token == "dev-token"
