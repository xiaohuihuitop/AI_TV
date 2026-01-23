"""
AI:视频处理脚本基础实现。
"""

import argparse
import datetime
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path


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


def normalize_prefix(prefix):
    """
    @brief AI:规范化路径前缀，保证以 / 结尾且无前导 /。
    @param prefix AI:原始前缀。
    @return AI:规范化前缀。
    """

    if not prefix:
        return ""
    normalized = prefix.strip()
    normalized = normalized.lstrip("/")
    if not normalized.endswith("/"):
        normalized = f"{normalized}/"
    return normalized


def join_url(base_url, prefix, filename):
    """
    @brief AI:拼接基础域名与资源路径。
    @param base_url AI:基础域名，可为空。
    @param prefix AI:路径前缀。
    @param filename AI:文件名。
    @return AI:拼接后的 URL。
    """

    normalized_prefix = normalize_prefix(prefix)
    if not base_url:
        return f"{normalized_prefix}{filename}" if normalized_prefix else filename
    trimmed = base_url.rstrip("/")
    return f"{trimmed}/{normalized_prefix}{filename}"


def compute_seek_time(duration):
    """
    @brief AI:计算缩略图截取时间点（10% 进度，至少 1 秒）。
    @param duration AI:视频时长（秒）。
    @return AI:截取时间（秒）。
    """

    return max(float(duration) * 0.1, 1.0)


def format_timestamp(timestamp):
    """
    @brief AI:将时间戳格式化为本地时区 ISO 时间。
    @param timestamp AI:Unix 时间戳（秒）。
    @return AI:ISO 格式时间字符串。
    """

    local_tz = datetime.datetime.now().astimezone().tzinfo
    return datetime.datetime.fromtimestamp(timestamp, tz=local_tz).isoformat()


def build_ffprobe_args(path):
    """
    @brief AI:构建 ffprobe 命令参数。
    @param path AI:视频路径。
    @return AI:参数列表。
    """

    return [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,side_data_list:stream_tags=rotate",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        str(path)
    ]


def run_command_json(args, runner=None):
    """
    @brief AI:执行命令并解析 JSON 输出。
    @param args AI:命令参数。
    @param runner AI:可注入的执行函数。
    @return AI:解析后的 JSON 对象。
    """

    execute = runner or subprocess.run
    result = execute(args, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def run_ffprobe(path, runner=None):
    """
    @brief AI:执行 ffprobe 获取视频元数据。
    @param path AI:视频路径。
    @param runner AI:可注入的执行函数。
    @return AI:元数据字典。
    """

    data = run_command_json(build_ffprobe_args(path), runner=runner)
    return parse_ffprobe_json(data)


def build_ffmpeg_copy_args(src, dest, clear_rotation):
    """
    @brief AI:构建 ffmpeg 复制命令参数。
    @param src AI:输入路径。
    @param dest AI:输出路径。
    @param clear_rotation AI:是否清理旋转元数据。
    @return AI:参数列表。
    """

    args = ["ffmpeg", "-y", "-i", str(src), "-c", "copy"]
    if clear_rotation:
        args += ["-metadata:s:v:0", "rotate=0"]
    args.append(str(dest))
    return args


def build_ffmpeg_transpose_args(src, dest, direction):
    """
    @brief AI:构建 ffmpeg 旋转转码命令参数。
    @param src AI:输入路径。
    @param dest AI:输出路径。
    @param direction AI:旋转方向（clockwise/counterclockwise）。
    @return AI:参数列表。
    """

    transpose = "1" if direction == "clockwise" else "2"
    return [
        "ffmpeg",
        "-y",
        "-i",
        str(src),
        "-vf",
        f"transpose={transpose}",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-metadata:s:v:0",
        "rotate=0",
        str(dest)
    ]


def build_thumbnail_args(src, dest, duration):
    """
    @brief AI:构建缩略图截取命令参数。
    @param src AI:输入路径。
    @param dest AI:输出路径。
    @param duration AI:视频时长（秒）。
    @return AI:参数列表。
    """

    seek = compute_seek_time(duration)
    return ["ffmpeg", "-y", "-ss", str(seek), "-i", str(src), "-frames:v", "1", str(dest)]


def build_item(file_path, output_path, cover_path, base_url, meta, rotated, video_prefix, cover_prefix):
    """
    @brief AI:构建 index.json 条目。
    @param file_path AI:源文件路径。
    @param output_path AI:输出视频路径。
    @param cover_path AI:输出封面路径。
    @param base_url AI:基础域名。
    @param meta AI:元数据字典。
    @param rotated AI:是否旋转。
    @param video_prefix AI:视频前缀。
    @param cover_prefix AI:封面前缀。
    @return AI:条目字典。
    """

    name = output_path.stem
    published_at = format_timestamp(file_path.stat().st_mtime)
    display_width, display_height = compute_display_dimensions(meta["width"], meta["height"], 0)
    return {
        "id": f"vid-{name}",
        "type": "video",
        "title": name,
        "published_at": published_at,
        "url": join_url(base_url, video_prefix, output_path.name),
        "cover": join_url(base_url, cover_prefix, cover_path.name),
        "duration": round(meta["duration"], 2),
        "duration_text": format_duration(meta["duration"]),
        "width": display_width,
        "height": display_height,
        "rotated": rotated
    }


def run_ffmpeg_copy(src, dest, clear_rotation, runner=None):
    """
    @brief AI:执行 ffmpeg 复制并可选清理旋转元数据。
    @param src AI:输入路径。
    @param dest AI:输出路径。
    @param clear_rotation AI:是否清理旋转元数据。
    @param runner AI:可注入的执行函数。
    @return AI:无返回值。
    """

    execute = runner or subprocess.run
    execute(build_ffmpeg_copy_args(src, dest, clear_rotation), check=True)


def run_ffmpeg_transpose(src, dest, direction, runner=None):
    """
    @brief AI:执行 ffmpeg 旋转转码。
    @param src AI:输入路径。
    @param dest AI:输出路径。
    @param direction AI:旋转方向。
    @param runner AI:可注入的执行函数。
    @return AI:无返回值。
    """

    execute = runner or subprocess.run
    execute(build_ffmpeg_transpose_args(src, dest, direction), check=True)


def run_thumbnail(src, dest, duration, runner=None):
    """
    @brief AI:生成缩略图。
    @param src AI:输入路径。
    @param dest AI:输出路径。
    @param duration AI:视频时长。
    @param runner AI:可注入的执行函数。
    @return AI:无返回值。
    """

    execute = runner or subprocess.run
    execute(build_thumbnail_args(src, dest, duration), check=True)


def collect_video_files(input_path):
    """
    @brief AI:收集输入路径中的 mp4 文件。
    @param input_path AI:输入路径（文件或目录）。
    @return AI:文件路径列表。
    """

    path = Path(input_path)
    if path.is_file():
        return [path] if path.suffix.lower() == ".mp4" else []
    if not path.exists():
        return []
    files = [item for item in path.iterdir() if item.is_file() and item.suffix.lower() == ".mp4"]
    return sorted(files, key=lambda item: item.name.lower())


def process_video_file(
    file_path,
    output_video_dir,
    output_cover_dir,
    base_url,
    video_prefix,
    cover_prefix,
    rotate_direction,
    probe_func=None,
    copy_func=None,
    transpose_func=None,
    thumbnail_func=None
):
    """
    @brief AI:处理单个视频文件，输出视频、封面并生成条目。
    @param file_path AI:输入文件路径。
    @param output_video_dir AI:视频输出目录。
    @param output_cover_dir AI:封面输出目录。
    @param base_url AI:基础域名。
    @param video_prefix AI:视频前缀。
    @param cover_prefix AI:封面前缀。
    @param rotate_direction AI:旋转方向。
    @param probe_func AI:探测函数。
    @param copy_func AI:复制函数。
    @param transpose_func AI:旋转转码函数。
    @param thumbnail_func AI:缩略图函数。
    @return AI:条目字典。
    """

    video_dir = Path(output_video_dir)
    cover_dir = Path(output_cover_dir)
    video_dir.mkdir(parents=True, exist_ok=True)
    cover_dir.mkdir(parents=True, exist_ok=True)
    source = Path(file_path)
    output_path = video_dir / f"{source.stem}.mp4"
    cover_path = cover_dir / f"{source.stem}.jpg"
    probe = probe_func or run_ffprobe
    copy_video = copy_func or run_ffmpeg_copy
    transpose_video = transpose_func or run_ffmpeg_transpose
    generate_thumb = thumbnail_func or run_thumbnail
    meta = probe(source)
    strategy = decide_rotation_strategy(meta["width"], meta["height"], meta.get("rotation", 0))
    rotated = False
    if strategy == "transpose":
        transpose_video(source, output_path, rotate_direction)
        rotated = True
    elif strategy == "clear_metadata":
        copy_video(source, output_path, True)
        rotated = True
    else:
        copy_video(source, output_path, False)
    output_meta = probe(output_path)
    generate_thumb(output_path, cover_path, output_meta["duration"])
    return build_item(source, output_path, cover_path, base_url, output_meta, rotated, video_prefix, cover_prefix)


def process_all_videos(files, process_func):
    """
    @brief AI:批量处理视频文件，收集成功与失败信息。
    @param files AI:待处理文件列表。
    @param process_func AI:处理函数。
    @return AI:成功条目列表与错误列表。
    """

    items = []
    errors = []
    for file_path in files:
        try:
            items.append(process_func(file_path))
        except Exception as exc:
            errors.append({"path": str(file_path), "error": str(exc)})
    return items, errors


def build_index_data(items, updated_at=None):
    """
    @brief AI:构建 index.json 数据结构。
    @param items AI:条目列表。
    @param updated_at AI:更新时间字符串。
    @return AI:索引数据字典。
    """

    if not updated_at:
        updated_at = datetime.datetime.now().astimezone().isoformat()
    return {"version": 1, "updated_at": updated_at, "items": items}


def check_command_exists(command, which_func=None):
    """
    @brief AI:检查命令是否可用。
    @param command AI:命令名称。
    @param which_func AI:可注入的查找函数。
    @return AI:是否存在。
    """

    finder = which_func or shutil.which
    return finder(command) is not None


def write_json_file(path, data):
    """
    @brief AI:写入 JSON 文件。
    @param path AI:输出路径。
    @param data AI:JSON 数据。
    @return AI:无返回值。
    """

    content = json.dumps(data, ensure_ascii=False, indent=2)
    Path(path).write_text(content, encoding="utf-8")


def parse_args(argv=None):
    """
    @brief AI:解析命令行参数。
    @param argv AI:参数列表。
    @return AI:解析结果。
    """

    parser = argparse.ArgumentParser(description="视频处理脚本：旋转、缩略图与索引生成")
    parser.add_argument("--input", required=True, help="输入视频文件或目录")
    parser.add_argument("--out-dir", required=True, help="输出目录")
    parser.add_argument("--base-url", default="", help="资源基础域名")
    parser.add_argument("--config", default="", help="index.json 输出路径")
    parser.add_argument("--video-prefix", default="video/", help="视频 URL 前缀")
    parser.add_argument("--cover-prefix", default="cover/", help="封面 URL 前缀")
    parser.add_argument(
        "--rotate",
        choices=["clockwise", "counterclockwise"],
        default="clockwise",
        help="旋转方向"
    )
    args = parser.parse_args(argv)
    if not args.config:
        args.config = str(Path(args.out_dir) / "index.json")
    return args


def main(argv=None):
    """
    @brief AI:脚本入口。
    @param argv AI:参数列表。
    @return AI:退出码。
    """

    args = parse_args(argv)
    if not check_command_exists("ffprobe") or not check_command_exists("ffmpeg"):
        print("缺少 ffprobe/ffmpeg，请先安装并配置到 PATH。", file=sys.stderr)
        return 1
    files = collect_video_files(args.input)
    if not files:
        print("未找到可处理的 mp4 文件。", file=sys.stderr)
        return 1
    out_dir = Path(args.out_dir)
    video_dir = out_dir / "video"
    cover_dir = out_dir / "cover"
    video_prefix = normalize_prefix(args.video_prefix)
    cover_prefix = normalize_prefix(args.cover_prefix)
    process_func = lambda file_path: process_video_file(
        file_path,
        video_dir,
        cover_dir,
        args.base_url,
        video_prefix,
        cover_prefix,
        args.rotate
    )
    items, errors = process_all_videos(files, process_func)
    items.sort(key=lambda item: item.get("published_at", ""), reverse=True)
    config_path = Path(args.config)
    config_path.parent.mkdir(parents=True, exist_ok=True)
    write_json_file(config_path, build_index_data(items))
    if errors:
        print("以下文件处理失败：", file=sys.stderr)
        for error in errors:
            print(f"- {error['path']}: {error['error']}", file=sys.stderr)
        return 1
    print(f"已生成索引文件：{config_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())


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
