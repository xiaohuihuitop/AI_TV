import os
import sqlite3
from datetime import datetime


def get_connection(db_path: str) -> sqlite3.Connection:
    """!
    @brief AI:创建并返回数据库连接。
    @param db_path AI:SQLite 数据库文件路径。
    @return AI:SQLite 连接对象。
    """

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


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


def _ensure_db(db_path: str) -> None:
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    init_db(db_path)


def create_item(db_path: str, item_type: str, title: str) -> int:
    """!
    @brief AI:创建内容记录并返回 ID。
    @param db_path AI:SQLite 数据库文件路径。
    @param item_type AI:内容类型。
    @param title AI:内容标题。
    @return AI:新建内容记录 ID。
    """

    _ensure_db(db_path)
    now = datetime.utcnow().isoformat()
    conn = get_connection(db_path)
    cur = conn.execute(
        """
        INSERT INTO items (type, title, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (item_type, title, "active", now, now)
    )
    conn.commit()
    item_id = cur.lastrowid
    conn.close()
    return int(item_id)


def create_file(
    db_path: str,
    item_id: int,
    path: str,
    size: int,
    sha256: str,
    mime: str
) -> int:
    """!
    @brief AI:创建文件记录并返回 ID。
    @param db_path AI:SQLite 数据库文件路径。
    @param item_id AI:关联内容 ID。
    @param path AI:文件路径。
    @param size AI:文件大小。
    @param sha256 AI:文件哈希。
    @param mime AI:文件 MIME 类型。
    @return AI:新建文件记录 ID。
    """

    _ensure_db(db_path)
    now = datetime.utcnow().isoformat()
    conn = get_connection(db_path)
    cur = conn.execute(
        """
        INSERT INTO files (item_id, path, size, sha256, mime, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (item_id, path, size, sha256, mime, now)
    )
    conn.commit()
    file_id = cur.lastrowid
    conn.close()
    return int(file_id)


def list_items(db_path: str, item_type: str | None) -> list:
    """!
    @brief AI:获取内容列表。
    @param db_path AI:SQLite 数据库文件路径。
    @param item_type AI:内容类型筛选，None 表示不筛选。
    @return AI:内容列表。
    """

    _ensure_db(db_path)
    conn = get_connection(db_path)
    if item_type:
        cur = conn.execute(
            "SELECT * FROM items WHERE status != 'deleted' AND type = ? ORDER BY id DESC",
            (item_type,)
        )
    else:
        cur = conn.execute(
            "SELECT * FROM items WHERE status != 'deleted' ORDER BY id DESC"
        )
    rows = cur.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_item(db_path: str, item_id: int) -> dict | None:
    """!
    @brief AI:获取内容详情。
    @param db_path AI:SQLite 数据库文件路径。
    @param item_id AI:内容记录 ID。
    @return AI:内容字典或 None。
    """

    _ensure_db(db_path)
    conn = get_connection(db_path)
    cur = conn.execute(
        "SELECT * FROM items WHERE id = ? AND status != 'deleted'",
        (item_id,)
    )
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def get_file(db_path: str, file_id: int) -> dict | None:
    """!
    @brief AI:获取文件详情。
    @param db_path AI:SQLite 数据库文件路径。
    @param file_id AI:文件记录 ID。
    @return AI:文件字典或 None。
    """

    _ensure_db(db_path)
    conn = get_connection(db_path)
    cur = conn.execute(
        "SELECT * FROM files WHERE id = ?",
        (file_id,)
    )
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def delete_item(db_path: str, item_id: int) -> bool:
    """!
    @brief AI:软删除指定内容记录。
    @param db_path AI:SQLite 数据库文件路径。
    @param item_id AI:内容记录 ID。
    @return AI:删除成功返回 True，否则返回 False。
    """

    _ensure_db(db_path)
    conn = get_connection(db_path)
    cur = conn.execute("SELECT id FROM items WHERE id = ?", (item_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return False
    conn.execute("UPDATE items SET status = 'deleted' WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return True
