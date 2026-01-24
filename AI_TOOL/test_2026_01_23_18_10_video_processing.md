# 视频处理脚本使用说明

## 用途
- 批量处理 mp4：自动判断竖屏并旋转为横屏，生成 10% 进度缩略图。
- 生成 `index.json`（包含 `cover`、`duration`、`duration_text` 等字段）供 App 使用。

## 依赖
- 已安装 `ffmpeg` 与 `ffprobe`，并可在 PATH 中调用。

## 输入与输出
- 输入目录/文件：`--input`
- 输出目录：`--out-dir`，内部会生成 `video/` 与 `cover/`
- 索引文件：`--config`
- 域名与路径：`--base-url`、`--video-prefix`、`--cover-prefix`

## 常用场景

### 场景 A：视频与缩略图都放在 `/video`
```
python AI_TOOL/video_processing_tool.py --input tv_data --out-dir output --base-url https://mp-e18f1939-5bc2-452a-8017-f0f14db67267.cdn.bspapp.com --video-prefix video/ --cover-prefix video/ --config output/index.json
```

### 场景 B：视频在 `/video`，缩略图在 `/cover`
```
python AI_TOOL/video_processing_tool.py --input tv_data --out-dir output --base-url https://example.com --video-prefix video/ --cover-prefix cover/ --config output/index.json
```

## 旋转说明
- 当检测到显示高度 > 宽度时，会旋转 90° 输出横屏。
- 若视频本身为横屏，则不会旋转。

## 结果验证
- `output/video/` 生成处理后视频。
- `output/cover/` 生成缩略图（10% 进度）。
- `output/index.json` 中 URL 必须包含完整域名，可用浏览器直接打开测试。
- App 设置页填入新的 `index.json` URL。

## 测试
- `pytest AI_TOOL/test_2026_01_23_18_10_video_processing.py -q`

## 常见问题
- URL 变成 `https:/video/v4.mp4`：说明未设置 `--base-url`。
- 提示缺少 `ffprobe/ffmpeg`：请先安装并配置到 PATH。