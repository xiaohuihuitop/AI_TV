# 后端运行说明

## 依赖安装
在项目根目录执行：

```bash
python -m pip install -r backend/requirements.txt
```

## 启动服务
进入 backend 目录并启动：

```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 环境变量
可参考 `backend/.env.example` 设置：

- `DATA_DIR`：内容存储目录（默认 `data`）
- `DB_PATH`：数据库路径（默认 `db/app.db`）
- `ADMIN_TOKEN`：管理端 Token（默认 `dev-token`）

## 基础验证
- 健康检查：`GET /health`
- 管理端连通：`GET /admin/ping`（需要 `Authorization: Bearer <token>`）
