# UniCloud 静态清单方案设计

## 背景与目标
- 目标：不自建服务器，内容完全公开，使用 UniCloud 云存储托管视频与图文，通过静态清单驱动 App 内容展示与离线缓存。
- 平台：仅 Android；前端使用 uniapp。

## 非目标
- 不包含账号体系、付费权限与内容加密。
- 不提供 Web 管理后台；内容维护完全依赖控制台与手工清单。

## 总体架构
- 云存储（公开 Bucket）：存放 mp4、md、封面图与 `index.json` 清单文件。
- App：拉取清单并展示；离线下载由本地缓存管理。
- 无云函数、无云数据库、无自建服务器。

## 远端目录建议
- `/videos/`：视频文件（mp4）
- `/articles/`：图文文件（md）
- `/covers/`：封面图（jpg/png）
- `/index.json`：内容清单

## 清单结构（index.json）
```json
{
  "version": 1,
  "updated_at": "2026-01-21T12:00:00+08:00",
  "items": [
    {
      "id": "vid-0001",
      "type": "video",
      "title": "示例视频",
      "published_at": "2026-01-20T18:30:00+08:00",
      "duration_sec": 120,
      "size_bytes": 10485760,
      "url": "https://<bucket-domain>/videos/demo.mp4",
      "cover_url": "https://<bucket-domain>/covers/demo.jpg"
    },
    {
      "id": "art-0001",
      "type": "article",
      "title": "示例图文",
      "published_at": "2026-01-19T10:00:00+08:00",
      "url": "https://<bucket-domain>/articles/demo.md"
    }
  ]
}
```

## App 数据流
1. 启动/下拉刷新：读取设置中的 `index_url`，拉取 `index.json`。
2. 解析并缓存：本地保存一份 `index_cache`，用于离线兜底。
3. “最新”页：按 `published_at` 倒序渲染，右侧提供下载入口。
4. 点击播放/阅读：直接使用远端 `url`。

## 离线缓存策略
- 下载：`uni.downloadFile` → `uni.saveFile` 保存到本地。
- 记录结构（本地存储 `download_items`）：
```json
{
  "id": "vid-0001",
  "type": "video",
  "title": "示例视频",
  "local_path": "file:///...",
  "downloaded_at": "2026-01-21T14:00:00+08:00",
  "size_bytes": 10485760
}
```
- “离线”页：按 `downloaded_at` 倒序渲染。
- 删除：移除本地文件 + 清理 `download_items` 记录。

## 设置页
- 可配置 `index_url`（默认指向云存储 `index.json`）。
- 展示本地缓存占用与一键清理入口。

## 错误处理
- 清单拉取失败：提示网络或地址问题，回退使用本地 `index_cache`。
- 下载失败：提示重试；若空间不足提示清理缓存。
- 资源不可用：提示链接失效或文件已删除。

## 运维与更新流程（手工）
1. 控制台上传/替换视频、图文、封面。
2. 手工编辑 `index.json`：追加/修改条目与时间。
3. 覆盖上传 `index.json` 至云存储根目录。

## 未来扩展
- 若需要登录/付费：可新增云函数生成临时访问链接并替换清单中的 `url`。

## 验收要点
- `index.json` 拉取成功并正确排序。
- 视频播放与图文渲染可用。
- 下载、离线列表与删除流程完整。
