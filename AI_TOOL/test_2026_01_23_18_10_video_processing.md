# 视频处理基础函数测试说明

## 用途
验证 `video_processing_tool.py` 中基础辅助函数的行为是否符合预期。

## 使用方法
1. 进入项目根目录。
2. 运行命令：`pytest AI_TOOL/test_2026_01_23_18_10_video_processing.py -q`。

## 预期结果
- `format_duration` 与 `compute_display_dimensions` 的测试全部通过。
- 输出显示 `2 passed`。