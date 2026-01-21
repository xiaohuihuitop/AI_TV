# 后端服务 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现可本地运行的 FastAPI + SQLite 后端，支持视频/图文的管理与客户端读取。

**Architecture:** 单体服务，FastAPI 提供管理端与客户端接口；SQLite 保存元数据；本地文件系统保存 mp4 与 md。

**Tech Stack:** Python、FastAPI、SQLite、Pytest、HTTPX

**执行提示:** 实现阶段请使用 @superpowers:test-driven-development 与 @superpowers:executing-plans。

### Task 1: 初始化配置模块

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/tests/test_config.py`
- Create: `backend/.env.example`

**Step 1: Write the failing test**

```python
from app.config import Settings

def test_settings_defaults():
    settings = Settings()
    assert settings.data_dir == "data"
    assert settings.db_path == "db/app.db"
    assert settings.admin_token == "dev-token"
```

**Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_config.py -v`
Expected: FAIL with "ModuleNotFoundError: No module named 'app'"

**Step 3: Write minimal implementation**

```python
# backend/app/config.py
from pydantic import BaseModel

class Settings(BaseModel):
    data_dir: str = "data"
    db_path: str = "db/app.db"
    admin_token: str = "dev-token"
```

```text
# backend/requirements.txt
fastapi==0.115.0
uvicorn==0.30.6
pydantic==2.9.2
python-multipart==0.0.9
pytest==8.3.2
httpx==0.27.2
```

```text
# backend/.env.example
DATA_DIR=data
DB_PATH=db/app.db
ADMIN_TOKEN=dev-token
```

**Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_config.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/requirements.txt backend/app/__init__.py backend/app/config.py backend/tests/test_config.py backend/.env.example
git commit -m "feat: 添加配置模块"
```

### Task 2: 创建 FastAPI 应用入口与健康检查

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/tests/test_main.py`

**Step 1: Write the failing test**

```python
from fastapi.testclient import TestClient
from app.main import app

def test_health():
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
```

**Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_main.py -v`
Expected: FAIL with "ImportError: cannot import name 'app'"

**Step 3: Write minimal implementation**

```python
# backend/app/main.py
from fastapi import FastAPI

app = FastAPI(title="AI_TV Backend")

@app.get("/health")
def health():
    return {"status": "ok"}
```

**Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_main.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/main.py backend/tests/test_main.py
git commit -m "feat: 添加健康检查接口"
```

### Task 3: SQLite 初始化与表结构创建

**Files:**
- Create: `backend/app/db.py`
- Create: `backend/tests/test_db.py`

**Step 1: Write the failing test**

```python
import sqlite3
from app.db import init_db, get_connection

def test_init_db_creates_tables(tmp_path):
    db_path = tmp_path / "app.db"
    init_db(str(db_path))
    conn = get_connection(str(db_path))
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = {row[0] for row in cur.fetchall()}
    assert "items" in tables
    assert "files" in tables
```

**Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_db.py -v`
Expected: FAIL with "ModuleNotFoundError: No module named 'app.db'"

**Step 3: Write minimal implementation**

```python
# backend/app/db.py
import sqlite3

def get_connection(db_path: str):
    conn = sqlite3.connect(db_path)
    return conn

def init_db(db_path: str):
    conn = sqlite3.connect(db_path)
    conn.execute(
        \"\"\"
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
        \"\"\"
    )
    conn.execute(
        \"\"\"
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
        \"\"\"
    )
    conn.commit()
    conn.close()
```

**Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_db.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/db.py backend/tests/test_db.py
git commit -m "feat: 初始化数据库表结构"
```

### Task 4: 管理端鉴权依赖

**Files:**
- Create: `backend/app/deps.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_auth.py`

**Step 1: Write the failing test**

```python
from fastapi.testclient import TestClient
from app.main import app

def test_admin_requires_token():
    client = TestClient(app)
    resp = client.get("/admin/ping")
    assert resp.status_code == 401
```

**Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_auth.py -v`
Expected: FAIL with "404" or "401 mismatch"

**Step 3: Write minimal implementation**

```python
# backend/app/deps.py
from fastapi import Header, HTTPException
from app.config import Settings

def admin_auth(authorization: str | None = Header(default=None)):
    settings = Settings()
    if authorization != f"Bearer {settings.admin_token}":
        raise HTTPException(status_code=401, detail="unauthorized")
    return True
```

```python
# backend/app/main.py
from fastapi import FastAPI, Depends
from app.deps import admin_auth

app = FastAPI(title="AI_TV Backend")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/admin/ping", dependencies=[Depends(admin_auth)])
def admin_ping():
    return {"status": "ok"}
```

**Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_auth.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/deps.py backend/app/main.py backend/tests/test_auth.py
git commit -m "feat: 添加管理端鉴权依赖"
```

### Task 5: 管理端视频上传

**Files:**
- Create: `backend/app/routers/admin.py`
- Modify: `backend/app/main.py`
- Create: `backend/app/services/storage.py`
- Create: `backend/tests/test_admin_upload.py`

**Step 1: Write the failing test**

```python
from fastapi.testclient import TestClient
from app.main import app

def test_admin_upload_video(tmp_path, monkeypatch):
    client = TestClient(app)
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    files = {"file": ("a.mp4", b"123", "video/mp4")}
    headers = {"Authorization": "Bearer dev-token"}
    resp = client.post("/admin/videos", files=files, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["type"] == "video"
```

**Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_admin_upload.py -v`
Expected: FAIL with "404"

**Step 3: Write minimal implementation**

```python
# backend/app/services/storage.py
import hashlib
import os
from datetime import datetime

def save_video(data_dir: str, filename: str, content: bytes):
    os.makedirs(os.path.join(data_dir, "videos"), exist_ok=True)
    path = os.path.join(data_dir, "videos", filename)
    with open(path, "wb") as f:
        f.write(content)
    sha256 = hashlib.sha256(content).hexdigest()
    return {
        "path": path,
        "size": len(content),
        "sha256": sha256,
        "created_at": datetime.utcnow().isoformat()
    }
```

```python
# backend/app/routers/admin.py
from fastapi import APIRouter, UploadFile, File, Depends
from app.deps import admin_auth
from app.config import Settings
from app.services.storage import save_video

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/videos", dependencies=[Depends(admin_auth)])
def upload_video(file: UploadFile = File(...)):
    settings = Settings()
    data = file.file.read()
    info = save_video(settings.data_dir, file.filename, data)
    return {"type": "video", "path": info["path"]}
```

```python
# backend/app/main.py
from fastapi import FastAPI
from app.routers.admin import router as admin_router

app = FastAPI(title="AI_TV Backend")
app.include_router(admin_router)
```

**Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_admin_upload.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/services/storage.py backend/app/routers/admin.py backend/app/main.py backend/tests/test_admin_upload.py
git commit -m "feat: 支持管理端视频上传"
```

### Task 6: 管理端图文导入与编辑

**Files:**
- Modify: `backend/app/routers/admin.py`
- Create: `backend/tests/test_admin_article.py`

**Step 1: Write the failing test**

```python
from fastapi.testclient import TestClient
from app.main import app

def test_admin_import_article(tmp_path, monkeypatch):
    client = TestClient(app)
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    headers = {"Authorization": "Bearer dev-token"}
    resp = client.post("/admin/articles", data={"title": "t", "content": "# hi"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["type"] == "article"
```

**Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_admin_article.py -v`
Expected: FAIL with "404"

**Step 3: Write minimal implementation**

```python
# backend/app/routers/admin.py
from fastapi import Form
from app.services.storage import save_article

@router.post("/articles", dependencies=[Depends(admin_auth)])
def import_article(title: str = Form(...), content: str = Form(...)):
    settings = Settings()
    info = save_article(settings.data_dir, title, content)
    return {"type": "article", "path": info["path"]}
```

```python
# backend/app/services/storage.py
def save_article(data_dir: str, title: str, content: str):
    os.makedirs(os.path.join(data_dir, "articles"), exist_ok=True)
    filename = f"{title}.md"
    path = os.path.join(data_dir, "articles", filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return {
        "path": path,
        "size": len(content.encode("utf-8")),
        "sha256": hashlib.sha256(content.encode("utf-8")).hexdigest(),
        "created_at": datetime.utcnow().isoformat()
    }
```

**Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_admin_article.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/services/storage.py backend/app/routers/admin.py backend/tests/test_admin_article.py
git commit -m "feat: 支持管理端图文导入"
```

### Task 7: 管理端列表与删除

**Files:**
- Modify: `backend/app/db.py`
- Modify: `backend/app/routers/admin.py`
- Create: `backend/tests/test_admin_list_delete.py`

**Step 1: Write the failing test**

```python
from fastapi.testclient import TestClient
from app.main import app

def test_admin_delete_not_found():
    client = TestClient(app)
    headers = {"Authorization": "Bearer dev-token"}
    resp = client.delete("/admin/items/999", headers=headers)
    assert resp.status_code == 404
```

**Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_admin_list_delete.py -v`
Expected: FAIL with "404 mismatch"

**Step 3: Write minimal implementation**

```python
# backend/app/db.py
def delete_item(db_path: str, item_id: int):
    conn = sqlite3.connect(db_path)
    cur = conn.execute("SELECT id FROM items WHERE id = ?", (item_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return False
    conn.execute("UPDATE items SET status = 'deleted' WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return True
```

```python
# backend/app/routers/admin.py
from fastapi import HTTPException
from app.db import delete_item

@router.delete("/items/{item_id}", dependencies=[Depends(admin_auth)])
def remove_item(item_id: int):
    settings = Settings()
    ok = delete_item(settings.db_path, item_id)
    if not ok:
        raise HTTPException(status_code=404, detail="not found")
    return {"status": "deleted"}
```

**Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_admin_list_delete.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/db.py backend/app/routers/admin.py backend/tests/test_admin_list_delete.py
git commit -m "feat: 支持管理端删除"
```

### Task 8: 客户端列表与详情读取

**Files:**
- Create: `backend/app/routers/client.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_client_list.py`

**Step 1: Write the failing test**

```python
from fastapi.testclient import TestClient
from app.main import app

def test_client_list_empty():
    client = TestClient(app)
    resp = client.get("/items")
    assert resp.status_code == 200
    assert resp.json() == []
```

**Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_client_list.py -v`
Expected: FAIL with "404"

**Step 3: Write minimal implementation**

```python
# backend/app/routers/client.py
from fastapi import APIRouter

router = APIRouter(tags=["client"])

@router.get("/items")
def list_items():
    return []
```

```python
# backend/app/main.py
from app.routers.client import router as client_router

app.include_router(client_router)
```

**Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_client_list.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/routers/client.py backend/app/main.py backend/tests/test_client_list.py
git commit -m "feat: 添加客户端列表接口"
```

### Task 9: 客户端视频流式读取

**Files:**
- Modify: `backend/app/routers/client.py`
- Create: `backend/tests/test_client_stream.py`

**Step 1: Write the failing test**

```python
from fastapi.testclient import TestClient
from app.main import app

def test_client_stream_not_found():
    client = TestClient(app)
    resp = client.get("/files/1/stream")
    assert resp.status_code == 404
```

**Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_client_stream.py -v`
Expected: FAIL with "404 mismatch"

**Step 3: Write minimal implementation**

```python
# backend/app/routers/client.py
from fastapi import HTTPException

@router.get("/files/{file_id}/stream")
def stream_file(file_id: int):
    raise HTTPException(status_code=404, detail="not found")
```

**Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_client_stream.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/app/routers/client.py backend/tests/test_client_stream.py
git commit -m "feat: 添加客户端流式读取占位"
```

### Task 10: 运行说明文档

**Files:**
- Create: `Doc/README_2026_01_21_11_27_backend_run.md`

**Step 1: Write the documentation**

```text
包含：依赖安装、启动命令、环境变量说明、API 访问示例。
```

**Step 2: Commit**

```bash
git add Doc/README_2026_01_21_11_27_backend_run.md
git commit -m "docs: 添加后端运行说明"
```
