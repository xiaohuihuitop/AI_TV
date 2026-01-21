from app.db import (
    create_file,
    create_item,
    get_connection,
    get_file,
    get_item,
    init_db,
    list_items
)


def test_init_db_creates_tables(tmp_path):
    db_path = tmp_path / "app.db"
    init_db(str(db_path))
    conn = get_connection(str(db_path))
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = {row[0] for row in cur.fetchall()}
    assert "items" in tables
    assert "files" in tables


def test_db_create_and_query(tmp_path):
    db_path = tmp_path / "app.db"
    item_id = create_item(str(db_path), "video", "title_a")
    file_id = create_file(str(db_path), item_id, "a.mp4", 3, "hash", "video/mp4")
    item = get_item(str(db_path), item_id)
    file_info = get_file(str(db_path), file_id)
    items = list_items(str(db_path), None)
    assert item["id"] == item_id
    assert file_info["id"] == file_id
    assert items and items[0]["id"] == item_id
