# AI TV Server Docker 部署说明

本文说明从 GitHub Actions / Release 下载服务端镜像 tar 后，如何在服务器或群晖 NAS 上导入、启动、升级和排查。

## 1. 镜像命名规则

当推送 tag，例如：

```text
build-v1.6
```

GitHub Actions 会生成：

```text
ai_tv_server_latest.tar
```

导入该 tar 后，本机 Docker 会出现镜像标签：

```text
ai_tv_server:latest
```

`build-*` tag 只用于触发 GitHub Actions 构建和区分 Release；镜像文件名固定为 `ai_tv_server_latest.tar`，镜像标签固定为 `ai_tv_server:latest`。

## 2. 下载镜像文件

在 GitHub Release 或 Actions artifact 中下载：

```text
ai_tv_server_latest.tar
```

`amd64` 适用于常见 Intel/AMD 服务器和多数 x86 群晖。如果设备是 ARM 架构，需要另外构建 `arm64` 镜像。

## 3. 导入镜像

把 tar 上传到服务器后执行：

```bash
docker load -i ai_tv_server_latest.tar
```

确认镜像已导入：

```bash
docker images | grep ai_tv_server
```

正常应看到类似：

```text
ai_tv_server   latest       ...
```

## 4. 准备数据目录

服务端所有持久化数据都放在容器内 `/data`：

- `/data/db/app.db`：数据库
- `/data/db/backups`：数据库备份
- `/data/videos`：视频文件
- `/data/covers`：封面
- `/data/docs`：文档
- `/data/tmp`：上传请求临时文件

群晖示例目录：

```bash
mkdir -p /volume1/SSD/docker/TV/TV_data
```

升级镜像不会删除数据，前提是 compose 的 volume 挂载路径保持不变。

## 5. docker-compose.yml 推荐写法

使用下载好的镜像 tar 时，compose 中应使用 `image`，不要使用 `build`。

推荐写法：

```yaml
version: "3.9"

services:
  ai_tv:
    image: ai_tv_server:latest
    container_name: ai_tv
    ports:
      - "8000:8000"
    environment:
      DATA_DIR: /data
      DB_PATH: /data/db/app.db
      BASIC_USER: admin
      BASIC_PASS: admin
      WORKER_INTERVAL_SEC: "2"
      MAX_VIDEO_UPLOAD_BYTES: "2147483648"
      MAX_DOC_UPLOAD_BYTES: "20971520"
      MAX_UPLOAD_FILES: "10"
      UPLOAD_CHUNK_BYTES: "1048576"
      STORAGE_RESERVE_BYTES: "134217728"
      SQLITE_BUSY_TIMEOUT_MS: "5000"
      CSRF_COOKIE_SECURE: "false"
      FIX_DATA_PERMISSIONS: "true"
      TZ: Asia/Shanghai
    volumes:
      - /volume1/SSD/docker/TV/TV_data:/data
    init: true
    stop_grace_period: 30s
    read_only: true
    restart: unless-stopped
```

这些配置的含义：

- `MAX_VIDEO_UPLOAD_BYTES`：单个视频最大字节数，默认 2GB。
- `MAX_DOC_UPLOAD_BYTES`：单个文档最大字节数，默认 20MB。
- `MAX_UPLOAD_FILES`：一次最多上传的文件数，默认 10。
- `UPLOAD_CHUNK_BYTES`：服务端写盘块大小，默认 1MB。
- `STORAGE_RESERVE_BYTES`：写入后必须保留的磁盘空间，默认 128MB。
- `SQLITE_BUSY_TIMEOUT_MS`：SQLite 锁等待时间，默认 5000ms。
- `CSRF_COOKIE_SECURE`：当前使用 HTTP 时必须为 `false`；以后全部切换为 HTTPS 后改成 `true`。
- `FIX_DATA_PERMISSIONS`：首次使用新版镜像时修正旧 `/data` 卷权限，默认 `true`。

镜像内服务进程以 UID/GID `10001:10001` 运行。入口脚本只在数据目录中没有 `.ai_tv_permissions_v1` 标记时递归修正一次权限，旧数据量较大时首次启动可能需要等待。确认首次启动成功后可以保留默认值；如果 NAS 禁止容器执行 `chown`，需在宿主机手动让 UID `10001` 可写数据目录，再设置 `FIX_DATA_PERMISSIONS: "false"`。

## 6. 启动服务

Docker Compose V2：

```bash
docker compose up -d
```

旧版 docker-compose：

```bash
docker-compose up -d
```

查看日志：

```bash
docker logs -f ai_tv
```

## 7. 验证服务

浏览器访问：

```text
http://服务器IP:8000
```

默认账号密码来自 compose：

```text
admin / admin
```

健康检查：

```bash
curl http://服务器IP:8000/healthz
```

`/healthz` 不需要账号密码，只检查数据库连接和数据目录是否可用，供 Docker 健康检查使用。原有需要 Basic Auth 的 `/health` 仍然保留。

系统状态页：

```text
http://服务器IP:8000/web/system
```

这个页面会显示 `DATA_DIR`、`DB_PATH`、视频/文档数量、失败视频数量、ffmpeg/ffprobe 是否可用，以及数据目录是否存在和可写。排查“新镜像没有旧数据”“环境变量是否生效”“视频识别失败”时，优先打开这个页面。

也可以直接请求系统状态 API：

```bash
curl -u admin:admin http://服务器IP:8000/api/system/status
```

视频管理页：

```text
http://服务器IP:8000/web/videos
```

视频上传时会显示浏览器端上传进度。上传到服务器完成后，视频还会进入后台识别队列，用于生成封面、时长和尺寸信息。视频管理页顶部的“处理队列与日志”会显示：

- 识别中数量
- 等待识别数量
- 识别失败数量
- 最近等待/识别/失败的视频和失败原因

如果还有等待或识别中的视频，页面会自动刷新状态；处理完成后会自动刷新一次列表，让新封面和时长显示出来。

也可以直接请求队列状态 API：

```bash
curl -u admin:admin http://服务器IP:8000/api/videos/tasks
```

App 清单地址示例：

```text
服务器IP:8000/public/index.json?user=admin&pass=admin
```

如果手机端使用当前项目默认配置，服务器域名示例为：

```text
https://tv.xiaohuihuitop.top/public/index.json?user=admin&pass=admin
```

本次可靠性加固没有改变 App 协议：清单和资源 URL 仍沿用现有 `user`、`pass` 查询参数认证，手机客户端不需要同步修改。

## 8. 上传与后台处理

上传文件会先按固定大小分块写入同目录 `.part` 临时文件，完整写入后再原子替换为正式文件。任一批次上传失败时，本批数据库记录和已写文件都会回滚，不会留下半个正式文件。

视频上传成功后仍需由后台 worker 生成封面并识别时长和尺寸。容器非正常中断时，处于 `processing` 的任务会在下次启动时自动恢复为 `pending` 并重新处理。后台页面中的上传百分比只代表文件传输进度，处理状态请在视频管理页的“处理队列与日志”查看。

后台 `/web` 写操作带 CSRF 校验。正常通过后台页面操作无需额外配置；脚本调用写接口时应使用 `/api` 接口和 Basic Auth，不要模拟后台表单。

## 9. 数据库备份与恢复

数据库使用 SQLite WAL 和锁等待配置。运行中创建备份时使用 SQLite 官方在线备份接口，不要直接复制正在使用的 `app.db`。

创建备份：

```bash
docker exec --user 10001:10001 ai_tv python /app/scripts/backup_database.py
```

命令会输出备份路径，默认写入：

```text
/data/db/backups/app_YYYYMMDD_HHMMSS.db
```

恢复数据库前必须停止主容器，避免旧连接继续写入。以下示例把备份恢复到同一个挂载目录：

```bash
docker compose stop ai_tv
docker run --rm \
  -v /volume1/SSD/docker/TV/TV_data:/data \
  -e DATA_DIR=/data \
  -e DB_PATH=/data/db/app.db \
  ai_tv_server:latest \
  python /app/scripts/restore_database.py /data/db/backups/app_YYYYMMDD_HHMMSS.db
docker compose start ai_tv
```

旧版 Compose 把 `docker compose` 换成 `docker-compose`。恢复脚本会先执行 SQLite 完整性检查，并将恢复前的数据库保留为 `app.db.pre_restore_时间.bak`。视频、封面和文档文件不包含在数据库备份中；完整灾备还需要同时备份整个宿主机 `TV_data` 目录。

## 10. 升级镜像

每次推送新的 `build-*` tag 后，GitHub Actions 会生成新的 `ai_tv_server_latest.tar`。升级步骤：

1. 下载新文件：

```text
ai_tv_server_latest.tar
```

2. 导入新镜像：

```bash
docker load -i ai_tv_server_latest.tar
```

3. 重新创建容器：

```bash
docker compose down
docker compose up -d --force-recreate
```

旧版 docker-compose：

```bash
docker-compose down
docker-compose up -d --force-recreate
```

4. 确认正在使用镜像：

```bash
docker inspect ai_tv --format '{{.Config.Image}}'
```

应输出：

```text
ai_tv_server:latest
```

## 11. 回滚旧版本

由于新构建固定覆盖 `ai_tv_server:latest`，建议升级前先保留旧 tar 文件，或在导入新 tar 前给当前镜像手动打一个备份标签：

```bash
docker tag ai_tv_server:latest ai_tv_server:backup
```

如果新版本有问题，可以改用备份镜像：

```yaml
image: ai_tv_server:backup
```

然后重新创建容器：

```bash
docker compose down
docker compose up -d
```

数据目录仍然挂载到同一个 `/data`，视频、封面和数据库不会因为切换镜像而消失。

## 12. 常见问题

### 启动时报端口被占用

报错示例：

```text
Bind for 0.0.0.0:8000 failed: port is already allocated
```

说明宿主机端口已经被占用。先查 Docker 容器：

```bash
docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Ports}}" | grep 8000
```

再查宿主机进程：

```bash
ss -lntp | grep :8000
```

如果要换宿主机端口，例如改成 `18080`：

```yaml
ports:
  - "18080:8000"
```

访问地址也要改为：

```text
http://服务器IP:18080
```

### 镜像环境变量页面没有 DATA_DIR

正常。镜像页面通常只显示镜像自带环境变量，例如 `PATH`、`LANG`、`PYTHON_VERSION`。`DATA_DIR`、`DB_PATH`、`BASIC_USER` 等是容器运行时由 compose 注入的。

检查运行中容器的变量：

```bash
docker exec ai_tv env | grep -E "DATA_DIR|DB_PATH|BASIC|WORKER"
```

也可以打开：

```text
http://服务器IP:8000/web/system
```

后台会直接显示运行中的 `DATA_DIR`、`DB_PATH` 和数据目录状态。

### 新镜像启动后没有旧数据

重点检查卷挂载是否正确：

```bash
docker inspect ai_tv --format '{{json .Mounts}}'
ls -lah /volume1/SSD/docker/TV/TV_data
ls -lah /volume1/SSD/docker/TV/TV_data/db
```

应看到宿主机目录挂载到容器 `/data`。

如果日志提示数据目录对 UID `10001` 不可写，先确认 `FIX_DATA_PERMISSIONS: "true"`，等待首次权限迁移完成。NAS 不允许容器修改所有者时，需要在宿主机管理界面或 SSH 中授予 UID/GID `10001:10001` 对该目录的读写权限。

### 修改 compose 后没有生效

仅重启容器可能不会应用新的环境变量、镜像版本或挂载配置。重新创建容器：

```bash
docker compose down
docker compose up -d --force-recreate
```

### 容器显示 unhealthy

先查看健康检查和应用日志：

```bash
docker inspect ai_tv --format '{{json .State.Health}}'
docker logs --tail 200 ai_tv
curl -v http://127.0.0.1:8000/healthz
```

重点检查 `/data` 挂载权限、`DB_PATH` 是否位于已挂载的数据目录，以及 SQLite 数据库是否完整。`/healthz` 不要求认证，不应在 URL 中附带管理员密码。

### 后台页面样式没有变化

先确认容器内是否包含新代码：

```bash
docker exec ai_tv grep -n "video-management-card" /app/app/templates/videos.html
docker exec ai_tv grep -n "video-management-card" /app/app/static/app.css
```

如果容器里有新代码，但浏览器仍显示旧页面，通常是浏览器缓存。请强制刷新页面，或直接打开：

```text
http://服务器IP:8000/static/app.css
```

检查 CSS 里是否有新样式字段。

### CPU 架构注意

当前 GitHub Actions 默认构建 `linux/amd64` 镜像。Intel/AMD 群晖可以直接使用。如果设备是 ARM 架构，需要把工作流平台改为 `linux/arm64` 或同时构建多架构镜像。

### 特殊排障：临时关闭后台识别

默认不需要设置。只有在排查数据库、迁移数据或临时不希望后台 worker 处理视频时，可以加：

```yaml
environment:
  ENABLE_WORKER: "false"
```

正常使用请保持默认开启，否则新上传的视频会一直停留在 `pending`。

## 13. HTTPS 域名与 WGT 自动更新

服务端容器继续在内部使用 `8000`，对外统一由 HTTPS 域名提供服务：

```text
https://tv.xiaohuihuitop.top/web/videos
https://tv.xiaohuihuitop.top/public/index.json
https://tv.xiaohuihuitop.top/update/update.json
```

其中 `/web`、`/api`、`/public` 和根路径转发给 AI TV 容器，`/update/` 是宿主机上的静态升级目录。WGT 文件不要放到 Docker 镜像中，更新时只需上传新 WGT 并替换更新清单，不需要重建或重启服务端容器。

### 13.1 Docker 端口

反代与 Docker 在同一台服务器时，将 compose 端口改为仅本机可访问：

```yaml
ports:
  - "127.0.0.1:8000:8000"
```

不要同时把 `8000` 暴露到公网。反代需要能访问宿主机 `127.0.0.1:8000`；若反代在另一个容器中，请把两个容器加入同一 Docker 网络，并将上游改为服务名 `ai_tv:8000`。

### 13.2 Caddy 示例

在宿主机创建升级目录，例如：

```bash
mkdir -p /volume1/SSD/docker/TV/TV_updates
```

以下 Caddy 配置会自动申请 HTTPS 证书。将升级目录替换为服务器上的实际路径：

```caddyfile
tv.xiaohuihuitop.top {
  handle_path /update/* {
    root * /volume1/SSD/docker/TV/TV_updates
    header Cache-Control "no-store"
    file_server
  }

  handle {
    reverse_proxy 127.0.0.1:8000
  }
}
```

Caddy 会传递反向代理需要的 `Host`、`X-Forwarded-For` 和 `X-Forwarded-Proto`。服务端据此生成 HTTPS 的 public 资源 URL。

### 13.3 Nginx 示例

如果使用 Nginx 或群晖 Web Station，静态升级目录和 AI TV 反代必须在同一个 HTTPS 站点中配置。以下是 Nginx 样例：

```nginx
server {
    listen 443 ssl http2;
    server_name tv.xiaohuihuitop.top;

    ssl_certificate     /etc/letsencrypt/live/tv.xiaohuihuitop.top/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tv.xiaohuihuitop.top/privkey.pem;
    client_max_body_size 2G;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;

    location ^~ /update/ {
        alias /volume1/SSD/docker/TV/TV_updates/;
        add_header Cache-Control "no-store" always;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

群晖仅使用“反向代理”时，`/update/` 还需要指向一个由 Web Station 或其他静态站点提供的目录；不能把 WGT 文件放到容器的只读根文件系统中。

### 13.4 WGT 发布步骤

手机客户端更新地址固定为：

```text
https://tv.xiaohuihuitop.top/update/update.json
```

每次发布 WGT：

1. 在 `android/manifest.json` 中把 App 资源版本提高，例如从 `1.0.0` 提高到 `1.0.1`，并同步提高版本号。
2. 使用 HBuilderX 的“发行 -> 原生 App -> 制作应用 WGT 资源包”生成 WGT；WGT 的 AppID 必须与当前 APK 相同。
3. 先将 WGT 上传到升级目录，例如 `TV_updates/ai-tv-1.0.1.wgt`。
4. 确认下载地址返回 `200` 后，再创建或替换 `TV_updates/update.json`：

```json
{
  "version": "1.0.1",
  "version_code": 101,
  "wgt_url": "https://tv.xiaohuihuitop.top/update/ai-tv-1.0.1.wgt",
  "size_bytes": 306509
}
```

先上传 WGT、后发布 `update.json`，可避免 App 看到一个尚未可下载的新版本。`version` 必须高于已安装资源版本，`wgt_url` 必须为 HTTPS 且以 `.wgt` 结尾；`size_bytes` 是 WGT 的实际字节数。

WGT 只能更新页面、JavaScript、CSS 和业务逻辑。修改 Android 权限、原生插件、图标、包名或 `manifest` 原生配置时，仍然需要发布并手动安装新的 APK。

### 13.5 域名验证

完成反代和上传后，检查：

```bash
curl -I https://tv.xiaohuihuitop.top/
curl -I https://tv.xiaohuihuitop.top/update/update.json
curl -u "<username>:<password>" https://tv.xiaohuihuitop.top/public/index.json
```

预期根路径和更新清单返回 HTTPS 成功响应。清单中的视频、封面和文档 URL 应以 `https://tv.xiaohuihuitop.top` 开头；如果仍是 `http://`，检查反代是否传递 `Host` 和 `X-Forwarded-Proto`。
