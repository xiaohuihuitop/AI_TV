# 视频处理脚本设计

## 目标
- 批量处理 mp4：自动识别显示方向，竖屏时旋转 90° 输出横屏视频。
- 在视频 10% 位置生成缩略图（jpg）。
- 生成适用于服务器的 `index.json`，新增 `cover`、`duration` 等字段。

## 约束
- 使用 `ffprobe/ffmpeg` 获取元数据与转码。
- 脚本放在 `AI_TOOL`，并配套说明 `.md`。
- 不修改源文件，输出到独立目录。
- 配置结构沿用现有 `index.json`（含 `version/updated_at/items`）。

## 输入与输出
- 输入目录：`--input`（默认扫描 `*.mp4`）。
- 输出目录：`--video-out`、`--cover-out`。
- 配置输出：`--config`，基础域名：`--base-url`。
- 命名规则：以原文件名为基准，输出 `.mp4` 与 `.jpg`。

## 元数据探测
- `ffprobe` 获取 `duration`、`width/height` 与旋转元数据（`rotate` 或 displaymatrix）。
- 计算“显示宽高”，用于判断真实方向。

## 旋转判定
- 若显示高度 > 显示宽度，判定为竖屏，转码并旋转 90° 输出横屏。
- 方向默认顺时针，可选 `--rotate=clockwise|counterclockwise`。
- 记录 `rotated` 字段。

## 转码与缩略图
- 需要旋转：`ffmpeg -vf transpose=1` 重新编码为 H.264/AAC。
- 无需旋转：直接复制到输出目录。
- 缩略图时间点：`t = max(duration * 0.1, 1)` 秒。
- 缩略图默认不缩放，保持比例（可扩展宽度参数）。

## 配置生成
- `id`：`vid-` + 文件名（去扩展名）。
- `title`：文件名（去扩展名）。
- `published_at`：文件修改时间（ISO 8601）。
- `url`：`${baseUrl}/video/<name>.mp4`。
- `cover`：`${baseUrl}/cover/<name>.jpg`。
- `duration`：秒；`duration_text`：`HH:MM:SS`。
- `width/height`：输出视频分辨率。
- 按 `published_at` 倒序。

## 异常处理
- `ffprobe/ffmpeg` 不可用：直接报错退出。
- 单文件失败：记录原因并继续处理其他文件，最后输出失败清单。

## 测试要点
- 竖屏样例：输出横屏且画面已旋转，缩略图正常。
- 横屏样例：不转码（仅复制），缩略图正常。
- 配置字段完整，封面链接可访问，时长与播放器一致。
