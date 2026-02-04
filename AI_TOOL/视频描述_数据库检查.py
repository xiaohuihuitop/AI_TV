import sys
from pathlib import Path
from sqlalchemy import text

ROOT = Path(__file__).resolve().parents[1]
SERVER_DIR = ROOT / "server"
sys.path.insert(0, str(SERVER_DIR))

from app.core.config import settings
import app.db.models
from app.db.session import get_engine, init_db


def main() -> None:
    """AI:检查视频表是否包含描述字段。
    @return: None。
    """
    db_path = Path(settings.db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    engine = get_engine()
    init_db(engine)
    with engine.connect() as conn:
        rows = conn.execute(text("PRAGMA table_info(videos)")).fetchall()
        columns = [row[1] for row in rows]
    if "description" not in columns:
        raise AssertionError("videos 表缺少 description 字段")
    print("OK: videos.description 字段已存在")


if __name__ == "__main__":
    main()
