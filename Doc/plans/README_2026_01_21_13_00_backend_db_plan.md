# Backend DB Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让后端把视频/图文真正写入 SQLite，并支持列表、详情与文件流式读取。

**Architecture:** API 仍由 FastAPI 提供；上传/导入时写入 SQLite 的 items/files 表；客户端列表与详情从 DB 读取；文件流式读取基于 files 表返回文件。

**Tech Stack:** Python、FastAPI、SQLite、Pytest、HTTPX

**执行提示:** 实现阶段请使用 @superpowers:test-driven-development 与 @superpowers:executing-plans。

### Task 1: 配置支持环境变量覆盖

**Files:**
- Modify: `backend/app/config.py`
- Modify: `backend/tests/test_config.py`

**Step 1: Write the failing test**

```python
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
```

**Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_config.py -v`  
Expected: FAIL with default values still used

**Step 3: Write minimal implementation**

```python
# backend/app/config.py
import os
from pydantic import BaseModel, Field


class Settings(BaseModel):
    """! ... """

    data_dir: str = Field(default_factory=lambda: os.getenv("DATA_DIR", "data"))
    db_path: str = Field(default_factory=lambda: os.getenv("DB_PATH", "db/app.db"))
    admin_token: str = Field(default_factory=lambda: os.getenv("ADMIN_TOKEN", "dev-token"))
```

**Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_config.py -v`  
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/config.py backend/tests/test_config.py
git commit -m "feat: 支持配置环境变量覆盖"
```

### Task 2: 完善 DB 访问函数（写入/读取）

**Files:**
- Modify: `backend/app/db.py`
- Modify: `backend/tests/test_db.py`

**Step 1: Write the failing test**

```python
from app.db import create_file, create_item, get_file, get_item, list_items


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
```

**Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_db.py -v`  
Expected: FAIL with missing function

**Step 3: Write minimal implementation**

```python
# backend/app/db.py
def create_item(db_path: str, item_type: str, title: str) -> int: ...
def create_file(db_path: str, item_id: int, path: str, size: int, sha256: str, mime: str) -> int: ...
def list_items(db_path: str, item_type: str | None) -> list: ...
def get_item(db_path: str, item_id: int) -> dict | None: ...
def get_file(db_path: str, file_id: int) -> dict | None: ...
```

**Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_db.py -v`  
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/db.py backend/tests/test_db.py
git commit -m "feat: 添加内容与文件的 DB 访问函数"
```

### Task 3: 上传与导入写入 DB 并返回 ID

**Files:**
- Modify: `backend/app/routers/admin.py`
- Modify: `backend/tests/test_admin_upload.py`
- Modify: `backend/tests/test_admin_article.py`

**Step 1: Write the failing test**

```python
def test_admin_upload_video_inserts_db(tmp_path, monkeypatch):
    client = TestClient(app)
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("DB_PATH", str(tmp_path / "db" / "app.db"))
    files = {"file": ("a.mp4", b"123", "video/mp4")}
    headers = {"Authorization": "Bearer dev-token"}
    resp = client.post("/admin/videos", files=files, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["item_id"] > 0
    assert resp.json()["file_id"] > 0
```

**Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_admin_upload.py -v`  
Expected: FAIL with missing fields

**Step 3: Write minimal implementation**

```python
# backend/app/routers/admin.py
item_id = create_item(...)
file_id = create_file(...)
return {"type": "video", "path": info["path"], "item_id": item_id, "file_id": file_id}
```

**Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_admin_upload.py -v`  
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/routers/admin.py backend/tests/test_admin_upload.py
git commit -m "feat: 上传视频写入数据库"
```

### Task 4: 客户端列表与详情读取真实数据

**Files:**
- Modify: `backend/app/routers/client.py`
- Modify: `backend/tests/test_client_list.py`
- Create: `backend/tests/test_client_detail.py`

**Step 1: Write the failing test**

```python
def test_client_list_and_detail(tmp_path, monkeypatch):
    client = TestClient(app)
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("DB_PATH", str(tmp_path / "db" / "app.db"))
    headers = {"Authorization": "Bearer dev-token"}
    client.post("/admin/articles", data={"title": "t", "content": "# hi"}, headers=headers)
    resp = client.get("/items")
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    item_id = resp.json()[0]["id"]
    detail = client.get(f"/items/{item_id}")
    assert detail.status_code == 200
    assert detail.json()["id"] == item_id
    assert "file_id" in detail.json()
```

**Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_client_list.py -v`  
Expected: FAIL with empty list

**Step 3: Write minimal implementation**

```python
# backend/app/routers/client.py
@router.get("/items")
def list_items_api(type: str | None = None): ...

@router.get("/items/{item_id}")
def get_item_api(item_id: int): ...
```

**Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_client_list.py -v`  
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/routers/client.py backend/tests/test_client_list.py backend/tests/test_client_detail.py
git commit -m "feat: 客户端列表与详情读取"
```

### Task 5: 文件流式读取返回真实文件

**Files:**
- Modify: `backend/app/routers/client.py`
- Modify: `backend/tests/test_client_stream.py`

**Step 1: Write the failing test**

```python
def test_client_stream_existing(tmp_path, monkeypatch):
    client = TestClient(app)
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("DB_PATH", str(tmp_path / "db" / "app.db"))
    headers = {"Authorization": "Bearer dev-token"}
    resp = client.post("/admin/videos", files={"file": ("a.mp4", b"123", "video/mp4")}, headers=headers)
    file_id = resp.json()["file_id"]
    stream = client.get(f"/files/{file_id}/stream")
    assert stream.status_code == 200
    assert stream.content == b"123"
```

**Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_client_stream.py -v`  
Expected: FAIL with 404

**Step 3: Write minimal implementation**

```python
# backend/app/routers/client.py
from fastapi.responses import FileResponse
file_info = get_file(...)
return FileResponse(file_info["path"], media_type=file_info["mime"])
```

**Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_client_stream.py -v`  
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/routers/client.py backend/tests/test_client_stream.py
git commit -m "feat: 客户端流式读取真实文件"
```
