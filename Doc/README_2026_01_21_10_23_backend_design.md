# 后端设计方案（FastAPI + SQLite）

## 目标与范围
- 提供稳定、低资源占用的本地后端服务，管理视频与图文内容。
- 支持：查看、上传、编辑、删除、排序、导入图文。
- 客户端仅需读取列表/详情与下载/播放。
- 先本地运行，后续以 Docker 部署到服务器。

## 技术选型
- 语言框架：Python + FastAPI（上手快、自动文档、参数校验完善）。
- 数据存储：SQLite（低资源、易维护）。
- 文件存储：本地文件系统（视频与 Markdown 分离存储）。

## 架构概览
- API 路由层：区分管理端与客户端只读接口。
- 服务层：上传、编辑、排序、导入图文的业务逻辑。
- 存储层：SQLite 元数据 + 文件系统内容。
- 文件处理：写入、校验、摘要生成。
- 配置/日志：`.env` 统一配置，结构化日志输出。

## 目录结构约定
```
data/
  videos/      # mp4
  articles/    # md
db/
  app.db
```

## 数据模型（SQLite）
```
items(
  id INTEGER PRIMARY KEY,
  type TEXT,               -- video | article
  title TEXT,
  summary TEXT,
  tags TEXT,
  order_index INTEGER,
  status TEXT,             -- active | deleted
  created_at TEXT,
  updated_at TEXT
)

files(
  id INTEGER PRIMARY KEY,
  item_id INTEGER,
  path TEXT,
  size INTEGER,
  sha256 TEXT,
  mime TEXT,
  duration INTEGER,        -- 视频可选
  created_at TEXT
)
```

## API 设计（草案）
管理端：
- `POST /admin/videos` 上传视频
- `POST /admin/articles` 上传/导入图文
- `PATCH /admin/items/{id}` 编辑信息/排序
- `DELETE /admin/items/{id}` 删除
- `GET /admin/items` 列表（管理视角）

客户端：
- `GET /items?type=video|article&sort=latest`
- `GET /items/{id}`
- `GET /files/{id}/stream`（视频流式输出或静态文件直连）

## 关键流程
- 上传视频：校验类型/大小 -> 写文件 -> 计算哈希 -> 写入数据库。
- 导入图文：写入 Markdown 文件 -> 生成摘要 -> 写入数据库。
- 编辑/排序：更新元数据与 order_index；图文编辑同步更新 Markdown 内容。
- 删除：默认软删（状态置为 deleted），可选硬删文件。
- 客户端读取：仅读接口，按时间或 order_index 排序。

## 错误处理与安全
- 统一错误结构：`code`、`message`、`detail`。
- 文件/DB 操作使用事务与回滚策略。
- 管理端使用固定 Token 鉴权；客户端只读可放开或使用只读 Token。
- 上传大小上限与流式读取避免内存爆炸。

## 配置
- `.env`：端口、数据路径、允许跨域、上传大小限制、管理端 Token。

## 测试计划（最小集）
- 上传视频/导入图文成功与失败场景。
- 编辑与排序生效。
- 删除（软删/硬删）行为正确。
- 列表排序与详情读取正确。
- 视频流式读取稳定。

## 部署与 Docker
- Docker 运行时挂载 `data/` 与 `db/` 为卷。
- 容器内只运行 FastAPI 服务，不依赖外部组件。
