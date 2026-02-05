import json
import subprocess
from pathlib import Path


def probe_video(path: Path) -> dict:
    """AI: 读取视频宽高与时长（保留原始尺寸）。
    @param path: 视频文件路径。
    @return: 包含 width/height/duration/rotate 的字典。
    """
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height:stream_tags=rotate:stream_side_data=rotation",
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
    duration = float((data.get("format") or {}).get("duration") or 0)
    return {"width": width, "height": height, "duration": duration, "rotate": rotate}


def rotate_if_needed(path: Path, width: int, height: int, rotate: int) -> None:
    """AI: 横屏视频执行旋转并清理旋转元数据。
    @param path: 视频文件路径。
    @param width: 原始宽度。
    @param height: 原始高度。
    @param rotate: 旋转元数据角度。
    @return: None
    """
    if width <= height:
        return
    transpose = 1
    if rotate in (90, -270):
        transpose = 2
    tmp = path.with_suffix(".rotated.mp4")
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(path),
        "-vf",
        f"transpose={transpose}",
        "-metadata:s:v:0",
        "rotate=0",
        "-c:a",
        "copy",
        str(tmp),
    ]
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
    rotate_if_needed(path, info["width"], info["height"], info.get("rotate") or 0)
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
