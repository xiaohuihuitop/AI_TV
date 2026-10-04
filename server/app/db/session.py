from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.db.base import Base


def get_engine(db_path: str | None = None, busy_timeout_ms: int | None = None):
    """AI: 创建数据库引擎。
    @param db_path: SQLite 文件路径。
    @return: SQLAlchemy Engine。
    """
    path = db_path or settings.db_path
    url = f"sqlite+pysqlite:///{path}"
    engine = create_engine(url, connect_args={"check_same_thread": False})
    timeout = busy_timeout_ms or settings.sqlite_busy_timeout_ms

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute(f"PRAGMA busy_timeout={int(timeout)}")
            cursor.execute("PRAGMA foreign_keys=ON")
        finally:
            cursor.close()

    return engine


def init_db(engine=None) -> None:
    """AI: 初始化数据库表结构。
    @param engine: SQLAlchemy Engine。
    @return: None
    """
    engine = engine or get_engine()
    Base.metadata.create_all(engine)
    _apply_migrations(engine)


def _apply_migrations(engine) -> None:
    migrations = (
        (1, _ensure_video_description),
        (2, _ensure_video_status_index),
        (3, _ensure_photo_album_metadata),
    )
    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE IF NOT EXISTS schema_migrations ("
                "version INTEGER PRIMARY KEY, applied_at VARCHAR(32) NOT NULL)"
            )
        )
        applied = set(conn.execute(text("SELECT version FROM schema_migrations")).scalars())
        for version, migration in migrations:
            if version in applied:
                continue
            migration(conn)
            conn.execute(
                text(
                    "INSERT INTO schema_migrations(version, applied_at) "
                    "VALUES (:version, CURRENT_TIMESTAMP)"
                ),
                {"version": version},
            )


def _ensure_video_description(conn) -> None:
    """Ensure existing databases contain the video description column."""
    rows = conn.execute(text("PRAGMA table_info(videos)")).fetchall()
    columns = [row[1] for row in rows]
    if "description" in columns:
        return
    conn.execute(text("ALTER TABLE videos ADD COLUMN description VARCHAR(20)"))
    conn.execute(
        text("UPDATE videos SET description='无' WHERE description IS NULL OR description=''")
    )


def _ensure_video_status_index(conn) -> None:
    """Ensure worker status lookups use an index on existing databases."""
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_videos_status_id ON videos(status, id)"))


def _ensure_photo_album_metadata(conn) -> None:
    """Ensure existing photo albums contain editable metadata fields."""
    rows = conn.execute(text("PRAGMA table_info(photo_albums)")).fetchall()
    columns = [row[1] for row in rows]
    if "description" not in columns:
        conn.execute(
            text("ALTER TABLE photo_albums ADD COLUMN description VARCHAR(2000) NOT NULL DEFAULT ''")
        )
    if "cover_photo_id" not in columns:
        conn.execute(text("ALTER TABLE photo_albums ADD COLUMN cover_photo_id INTEGER"))
    conn.execute(
        text(
            "UPDATE photo_albums SET cover_photo_id = "
            "(SELECT p.id FROM photos p WHERE p.album_id = photo_albums.id "
            "ORDER BY p.position ASC, p.id ASC LIMIT 1) "
            "WHERE cover_photo_id IS NULL"
        )
    )


def get_sessionmaker(engine=None):
    """AI: 创建 Session 工厂。
    @param engine: SQLAlchemy Engine。
    @return: sessionmaker。
    """
    engine = engine or get_engine()
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)
