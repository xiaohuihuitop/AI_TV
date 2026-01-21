import sqlite3


def get_connection(db_path: str) -> sqlite3.Connection:
    """!
    @brief AI:创建并返回数据库连接。
    @param db_path AI:SQLite 数据库文件路径。
    @return AI:SQLite 连接对象。
    """

    return sqlite3.connect(db_path)


def init_db(db_path: str) -> None:
    """!
    @brief AI:初始化数据库并创建基础表结构。
    @param db_path AI:SQLite 数据库文件路径。
    @return AI:无。
    """

    conn = sqlite3.connect(db_path)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY,
            type TEXT,
            title TEXT,
            summary TEXT,
            tags TEXT,
            order_index INTEGER,
            status TEXT,
            created_at TEXT,
            updated_at TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY,
            item_id INTEGER,
            path TEXT,
            size INTEGER,
            sha256 TEXT,
            mime TEXT,
            duration INTEGER,
            created_at TEXT
        )
        """
    )
    conn.commit()
    conn.close()
