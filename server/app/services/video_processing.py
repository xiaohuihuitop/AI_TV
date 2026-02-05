import json
import subprocess
from pathlib import Path


def probe_video(path: Path) -> dict:
    """AI: 读取视频显示宽高与时长（考虑旋转元数据）。
    @param path: 视频文件路径。
    @return: 包含 width/height/duration 的字典。
    """
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height:stream_tags=rotate:side_data_list",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        str(path),
    ]
    result = subprocess.check_output(cmd)
    data = json.loads(result)
    stream = (data.get("streams") or [{}])[0]
    width = int(stream.get("width") or 0)
    height = int(stream.get("height") or 0)
    rotate = _resolve_rotate(stream)
    display_width, display_height = _apply_rotation(width, height, rotate)
    duration = float((data.get("format") or {}).get("duration") or 0)
    return {"width": display_width, "height": display_height, "duration": duration}


def rotate_if_needed(path: Path, width: int, height: int) -> None:
    """AI: 按显示宽高判断是否旋转。
    @param path: 视频文件路径。
    @param width: 显示宽度。
    @param height: 显示高度。
    @return: None
    """
    if width <= height:
        return
    tmp = path.with_suffix(".rotated.mp4")
    cmd = ["ffmpeg", "-y", "-i", str(path), "-vf", "transpose=1", str(tmp)]
    subprocess.check_call(cmd)
    tmp.replace(path)


def extract_cover(path: Path, seconds: float, cover_path: Path) -> None:
    """AI: 从指定时间点抽帧封面。
    @param path: 视频文件路径。
    @param seconds: 截图时间（秒）。
    @param cover_path: 输出封面路径。
    @return: None
    """
    cmd = ["ffmpeg", "-y", "-ss", f"{seconds}", "-i", str(path), "-frames:v", "1", str(cover_path)]
    subprocess.check_call(cmd)


def process_video(path: Path, cover_path: Path) -> dict:
    """AI: 完整视频处理流程。
    @param path: 视频文件路径。
    @param cover_path: 输出封面路径。
    @return: 处理结果（宽高/时长）。
    """
    info = probe_video(path)
    rotate_if_needed(path, info["width"], info["height"])
    info = probe_video(path)
    extract_cover(path, info["duration"] * 0.1, cover_path)
    return info


def _resolve_rotate(stream: dict) -> int:
    """AI: 解析旋转角度。
    @param stream: ffprobe 返回的 stream 字典。
    @return: 旋转角度（整数，默认 0）。
    """
    tags = stream.get("tags") or {}
    raw = tags.get("rotate")
    if raw is not None:
        try:
            return int(float(raw))
        except (TypeError, ValueError):
            return 0
    for side in stream.get("side_data_list") or []:
        if "rotation" in side:
            try:
                return int(float(side.get("rotation")))
            except (TypeError, ValueError):
                return 0
    return 0


def _apply_rotation(width: int, height: int, rotate: int) -> tuple[int, int]:
    """AI: 根据旋转角度返回显示宽高。
    @param width: 原始宽度。
    @param height: 原始高度。
    @param rotate: 旋转角度。
    @return: 显示宽高元组。
    """
    if abs(rotate) in (90, 270):
        return height, width
    return width, height
