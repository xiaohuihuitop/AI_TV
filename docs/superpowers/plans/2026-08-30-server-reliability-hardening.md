# Server Reliability Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变 App 现有查询参数认证协议的前提下，提高大文件上传、视频后台处理、SQLite 数据、后台写操作和 Docker 部署的可靠性与安全性。

**Architecture:** 上传、数据库备份和 CSRF 分别放入独立服务或核心模块，路由只负责 HTTP 参数和响应映射。视频 worker 继续保持单容器单线程，但由 FastAPI lifespan 管理，并通过原子任务领取、启动恢复和循环异常边界避免任务永久卡住。SQLite 使用版本化轻量迁移、WAL 和 busy timeout，不新增第三方依赖。

**Tech Stack:** FastAPI、SQLAlchemy 2、SQLite、Python 标准库、Jinja2、Docker、独立 Python 回归脚本。

---

### Task 1: 可靠上传与事务补偿

**Files:**
- Create: `server/app/services/uploads.py`
- Modify: `server/app/core/config.py`
- Modify: `server/app/db/repo.py`
- Modify: `server/app/api/routes.py`
- Modify: `server/app/web/routes.py`
- Test: `AI_TOOL/server_reliability_test.py`

- [x] 编写分块读取、单文件上限、批量数量上限、磁盘保留空间和批量失败清理测试，并确认当前缺少实现而失败。
- [x] 实现 `.part` 临时文件分块写入和原子替换，异常时删除临时文件。
- [x] 将视频和文档批量上传放入单次数据库事务；任一文件失败时回滚记录并清理本批文件。
- [x] 删除时先把文件原子移动到同盘暂存路径；数据库提交失败则恢复原文件，提交成功再清理暂存文件。
- [x] API 与 Web 路由复用上传服务，将超限映射为 413、磁盘不足映射为 507。
- [x] 运行可靠性测试和既有后台测试。

### Task 2: Worker 生命周期与中断恢复

**Files:**
- Modify: `server/app/tasks/worker.py`
- Modify: `server/app/main.py`
- Test: `AI_TOOL/server_reliability_test.py`

- [x] 编写 `processing` 启动恢复、原子领取、处理异常记录和任务删除竞态测试，并确认当前失败。
- [x] 将任务领取改为条件更新；ffmpeg 在数据库会话外执行，完成后重新读取任务再更新。
- [x] 使用 FastAPI lifespan 启停线程和数据库引擎；循环捕获并记录未预期异常，使用停止事件代替不可中断的永久睡眠。
- [x] 启动 worker 前把遗留 `processing` 恢复为 `pending`。
- [x] 运行 worker 与应用生命周期测试。

### Task 3: SQLite 迁移、WAL 与备份恢复

**Files:**
- Modify: `server/app/db/session.py`
- Create: `server/app/services/database_backup.py`
- Create: `server/scripts/backup_database.py`
- Create: `server/scripts/restore_database.py`
- Test: `AI_TOOL/server_reliability_test.py`

- [x] 编写 WAL、busy timeout、迁移版本、在线备份完整性和离线恢复测试，并确认当前失败。
- [x] 在 SQLAlchemy 连接事件中设置 WAL、busy timeout 和 foreign keys。
- [x] 新增 `schema_migrations` 表并把现有 description 迁移登记为版本 1。
- [x] 使用 `sqlite3.Connection.backup` 创建一致备份；恢复前校验备份并保留原数据库副本。
- [x] 运行数据库可靠性测试。

### Task 4: Web CSRF 防护

**Files:**
- Create: `server/app/core/csrf.py`
- Modify: `server/app/main.py`
- Modify: `server/app/web/routes.py`
- Modify: `server/app/templates/layout.html`
- Modify: `server/app/static/upload.js`
- Modify: `server/app/static/video-tasks.js`
- Test: `AI_TOOL/server_reliability_test.py`
- Test: `AI_TOOL/server_admin_features_test.py`

- [x] 编写无 token 的 Web POST 返回 403、有效双提交 token 成功的测试，并确认当前失败。
- [x] 中间件生成 HttpOnly、SameSite=Strict 的 CSRF cookie，并把 token 注入请求状态。
- [x] Web 路由对非安全方法比较 cookie 与表单或请求头 token；API 和 public 协议不变。
- [x] 页面自动为普通 POST 表单补隐藏字段，XHR 上传和动态重试表单发送请求头或隐藏字段。
- [x] 更新既有后台测试统一获取 CSRF cookie 后执行写操作。

### Task 5: Docker 加固与文档

**Files:**
- Modify: `server/Dockerfile`
- Modify: `server/docker-compose.yml`
- Modify: `server/README.md`
- Modify: `docs/project/计划.md`
- Modify: `docs/project/进度.md`
- Modify: `docs/project/总结.md`
- Modify: `docs/project/项目总览.md`
- Modify: `ai_knowledge.md`
- Modify: `docs/memory/当前状态.md`

- [x] Docker 镜像创建非 root 用户并只授予 `/data`、`/app` 所需权限。
- [x] 增加无需泄露凭据的容器健康检查、`init`、停止宽限期和上传限制环境变量示例。
- [x] README 增加限制配置、worker 恢复、数据库备份和恢复操作说明。
- [x] 更新项目正式文档、知识记录和当前状态。
- [x] 执行全部 Python/Node 回归、Python 编译检查和 `git diff --check`。
- [ ] 在具备 Docker CLI 的环境执行 `docker build`、入口脚本权限迁移和容器 `/healthz` 检查。

## 范围约束

- 保留 `user`/`pass` 查询参数和清单中现有资源 URL 认证方式。
- 不修改手机客户端协议，不新增外部队列、Redis、Alembic 或其他运行依赖。
- 不修改 GitHub Actions 工作流和镜像 `latest` 命名规则。
- 不提交或覆盖当前 Android 未提交改动。
