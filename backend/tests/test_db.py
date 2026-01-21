from app.db import get_connection, init_db


def test_init_db_creates_tables(tmp_path):
    db_path = tmp_path / "app.db"
    init_db(str(db_path))
    conn = get_connection(str(db_path))
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = {row[0] for row in cur.fetchall()}
    assert "items" in tables
    assert "files" in tables
