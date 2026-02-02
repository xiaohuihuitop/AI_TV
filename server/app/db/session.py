from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.db.base import Base


def get_engine(db_path: str | None = None):
    """AI: 创建数据库引擎。
    @param db_path: SQLite 文件路径。
    @return: SQLAlchemy Engine。
    """
    path = db_path or settings.db_path
    url = f"sqlite+pysqlite:///{path}"
    return create_engine(url, connect_args={"check_same_thread": False})


def init_db(engine=None) -> None:
    """AI: 初始化数据库表结构。
    @param engine: SQLAlchemy Engine。
    @return: None
    """
    engine = engine or get_engine()
    Base.metadata.create_all(engine)


def get_sessionmaker(engine=None):
    """AI: 创建 Session 工厂。
    @param engine: SQLAlchemy Engine。
    @return: sessionmaker。
    """
    engine = engine or get_engine()
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)