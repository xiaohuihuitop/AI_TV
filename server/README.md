# AI TV Server Docker 部署说明

本文说明下载 GitHub Actions 打包好的服务端镜像文件后，如何在服务器或群晖 NAS 上运行。

## 1. 下载镜像文件

在 GitHub Release 或 Actions artifact 中下载：

```text
ai_tv_server_latest.tar
```

该文件是已经构建好的 Docker 镜像，镜像名为：

```text
ai_tv_server:latest
```

## 2. 导入镜像

把 `ai_tv_server_latest.tar` 上传到服务器后执行：

```bash
docker load -i ai_tv_server_latest.tar
```

确认镜像已导入：

```bash
docker images | grep ai_tv_server
```

## 3. 准备数据目录

服务端所有持久化数据都放在容器内 `/data`：

- `/data/db/app.db`：数据库
- `/data/videos`：视频文件
- `/data/covers`：封面
- `/data/docs`：文档

群晖示例目录：

```bash
mkdir -p /volume1/SSD/docker/TV/TV_data
```

## 4. docker-compose.yml 示例

如果使用下载好的镜像 tar，compose 中应使用 `image`，不要使用 `build`。

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

启动：

```bash
docker compose up -d
```

查看日志：

```bash
docker logs -f ai_tv
```

## 5. 验证服务

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

App 清单地址示例：

```text
服务器IP:8000/public/index.json?user=admin&pass=admin
```

如果手机端使用当前项目默认配置，服务器域名示例为：

```text
qh.xhhtop.top:8000/public/index.json?user=admin&pass=admin
```

## 6. 升级镜像

下载新的 `ai_tv_server_latest.tar` 后：

```bash
docker compose down
docker load -i ai_tv_server_latest.tar
docker compose up -d
```

数据目录挂载到宿主机 `/volume1/SSD/docker/TV/TV_data`，升级镜像不会删除已有数据。

## 7. 常见问题

### 镜像环境变量页面没有 DATA_DIR

正常。镜像页面通常只显示镜像自带环境变量，例如 `PATH`、`LANG`、`PYTHON_VERSION`。`DATA_DIR`、`DB_PATH`、`BASIC_USER` 等是容器运行时由 compose 注入的。

检查运行中容器的变量：

```bash
docker exec ai_tv env | grep -E "DATA_DIR|DB_PATH|BASIC|WORKER"
```

### 新镜像启动后没有旧数据

重点检查卷挂载是否正确：

```bash
docker inspect ai_tv --format '{{json .Mounts}}'
ls -lah /volume1/SSD/docker/TV/TV_data
ls -lah /volume1/SSD/docker/TV/TV_data/db
```

应看到宿主机目录挂载到容器 `/data`。

### 修改 compose 后没有生效

仅重启容器可能不会应用新的环境变量或挂载配置。重新创建容器：

```bash
docker compose down
docker compose up -d
```

### CPU 架构注意

当前 GitHub Actions 默认构建 `linux/amd64` 镜像。Intel/AMD 群晖可以直接使用。如果设备是 ARM 架构，需要把工作流平台改为 `linux/arm64` 或同时构建多架构镜像。
