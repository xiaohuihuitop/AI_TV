"""
AI:视频处理脚本基础实现。
"""

import math


def format_duration(seconds):
    """
    @brief AI:将秒数格式化为 HH:MM:SS。
    @param seconds AI:秒数（float 或 int）。
    @return AI:格式化后的字符串。
    """

    total = int(math.floor(max(0, seconds)))
    hours = total // 3600
    minutes = (total % 3600) // 60
    secs = total % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def compute_display_dimensions(width, height, rotation):
    """
    @brief AI:根据旋转信息计算显示宽高。
    @param width AI:原始宽度。
    @param height AI:原始高度。
    @param rotation AI:旋转角度（0/90/180/270）。
    @return AI:显示宽高元组。
    """

    normalized = (rotation or 0) % 360
    if normalized in (90, 270):
        return height, width
    return width, height
