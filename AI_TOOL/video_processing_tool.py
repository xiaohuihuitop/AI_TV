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


def parse_rotation_value(stream):
    """
    @brief AI:从 ffprobe 的 stream 中解析旋转角度。
    @param stream AI:ffprobe 的视频流字典。
    @return AI:旋转角度（int）。
    """

    tags = stream.get("tags") or {}
    rotate_tag = tags.get("rotate")
    if rotate_tag is not None:
        try:
            return int(float(rotate_tag))
        except ValueError:
            return 0
    for item in stream.get("side_data_list") or []:
        if "rotation" in item:
            try:
                return int(float(item["rotation"]))
            except ValueError:
                return 0
    return 0


def parse_ffprobe_json(data):
    """
    @brief AI:解析 ffprobe 输出的 JSON 数据。
    @param data AI:ffprobe JSON 对象。
    @return AI:包含 width/height/rotation/duration 的字典。
    """

    streams = data.get("streams") or []
    stream = streams[0] if streams else {}
    width = int(stream.get("width") or 0)
    height = int(stream.get("height") or 0)
    rotation = parse_rotation_value(stream)
    duration = float(data.get("format", {}).get("duration") or 0)
    return {
        "width": width,
        "height": height,
        "rotation": rotation,
        "duration": duration
    }


def decide_rotation_strategy(width, height, rotation):
    """
    @brief AI:判断是否需要旋转，以及采用哪种处理策略。
    @param width AI:原始宽度。
    @param height AI:原始高度。
    @param rotation AI:旋转角度。
    @return AI:策略字符串（none/clear_metadata/transpose）。
    """

    display_width, display_height = compute_display_dimensions(width, height, rotation)
    if display_height <= display_width:
        return "none"
    normalized = (rotation or 0) % 360
    if width >= height and normalized in (90, 270):
        return "clear_metadata"
    return "transpose"
