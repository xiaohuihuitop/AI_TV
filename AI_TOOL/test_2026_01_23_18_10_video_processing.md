# 视频处理脚本测试说明

## 用途
- 验证 `video_processing_tool.py` 的基础函数与处理流程是否符合预期。
- 提供脚本的实际运行示例。

## 依赖
- 已安装 `ffmpeg` 与 `ffprobe`，并可在 PATH 中调用。

## 使用方法
1. 进入项目根目录。
2. 运行单元测试：`pytest AI_TOOL/test_2026_01_23_18_10_video_processing.py -q`。
3. 运行脚本示例：`python AI_TOOL/video_processing_tool.py --input tv_data --out-dir output --base-url https://example.com --config output/index.json`。

## 预期结果
- 单元测试全部通过（输出 `24 passed`，数量可能随测试增减）。
- `output/video/` 生成处理后视频。
- `output/cover/` 生成 10% 进度缩略图。
- `output/index.json` 包含 `cover`、`duration`、`duration_text` 等字段。