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
- `/data/videos`：视频文件
- `/data/covers`：封面
- `/data/docs`：文档

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
      TZ: Asia/Shanghai
    volumes:
      - /volume1/SSD/docker/TV/TV_data:/data
    restart: unless-stopped
```

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
curl -u admin:admin http://服务器IP:8000/health
```

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
qh.xhhtop.top:8000/public/index.json?user=admin&pass=admin
```

## 8. 升级镜像

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
docker compose up -d
```

旧版 docker-compose：

```bash
docker-compose down
docker-compose up -d
```

4. 确认正在使用镜像：

```bash
docker inspect ai_tv --format '{{.Config.Image}}'
```

应输出：

```text
ai_tv_server:latest
```

## 9. 回滚旧版本

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

## 10. 常见问题

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

### 修改 compose 后没有生效

仅重启容器可能不会应用新的环境变量、镜像版本或挂载配置。重新创建容器：

```bash
docker compose down
docker compose up -d
```

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
