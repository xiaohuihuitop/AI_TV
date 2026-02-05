import json
import subprocess
from pathlib import Path


def probe_video(path: Path) -> dict:
    """AI: 读取视频宽高与时长。
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
        "stream=width,height",
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
    duration = float((data.get("format") or {}).get("duration") or 0)
    return {"width": width, "height": height, "duration": duration}


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
    """AI: 处理视频并抽取封面。
    @param path: 视频文件路径。
    @param cover_path: 输出封面路径。
    @return: 处理结果（宽高/时长）。
    """
    info = probe_video(path)
    extract_cover(path, info["duration"] * 0.1, cover_path)
    return info
