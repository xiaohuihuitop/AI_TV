"""
AI:视频处理脚本基础函数单元测试。
"""

import json
import os
import sys

import pytest

CURRENT_DIR = os.path.dirname(__file__)
sys.path.insert(0, CURRENT_DIR)

from video_processing_tool import compute_display_dimensions, format_duration


def test_format_duration():
    assert format_duration(0) == "00:00:00"
    assert format_duration(61.2) == "00:01:01"
    assert format_duration(3661) == "01:01:01"


def test_compute_display_dimensions_rotate():
    width, height = compute_display_dimensions(1920, 1080, 90)
    assert (width, height) == (1080, 1920)


SAMPLE = {
    "streams": [
        {
            "width": 1920,
            "height": 1080,
            "tags": {"rotate": "90"}
        }
    ],
    "format": {"duration": "12.34"}
}


def test_parse_ffprobe_json():
    from video_processing_tool import parse_ffprobe_json

    meta = parse_ffprobe_json(SAMPLE)
    assert meta["width"] == 1920
    assert meta["height"] == 1080
    assert meta["rotation"] == 90
    assert meta["duration"] == 12.34


def test_decide_rotation_strategy_clear_metadata():
    from video_processing_tool import decide_rotation_strategy

    strategy = decide_rotation_strategy(1920, 1080, 90)
    assert strategy == "clear_metadata"


def test_normalize_prefix():
    from video_processing_tool import normalize_prefix

    assert normalize_prefix("video") == "video/"
    assert normalize_prefix("/video/") == "video/"
    assert normalize_prefix("") == ""


def test_join_url():
    from video_processing_tool import join_url

    assert join_url("https://example.com", "video/", "a.mp4") == "https://example.com/video/a.mp4"
    assert join_url("", "video/", "a.mp4") == "video/a.mp4"
    assert join_url("", "", "a.mp4") == "a.mp4"


def test_compute_seek_time():
    from video_processing_tool import compute_seek_time

    assert compute_seek_time(100) == 10.0
    assert compute_seek_time(5) == 1.0


def test_build_ffprobe_args():
    from video_processing_tool import build_ffprobe_args

    args = build_ffprobe_args("demo.mp4")
    assert args[0] == "ffprobe"
    assert args[-1] == "demo.mp4"


def test_build_item(tmp_path):
    from video_processing_tool import build_item, format_timestamp

    sample = tmp_path / "sample.mp4"
    sample.write_text("x")
    os.utime(sample, (1_700_000_000, 1_700_000_000))
    output_path = tmp_path / "out.mp4"
    cover_path = tmp_path / "out.jpg"
    meta = {"width": 1920, "height": 1080, "duration": 12.34}
    item = build_item(
        sample,
        output_path,
        cover_path,
        "https://example.com",
        meta,
        True,
        "video/",
        "cover/"
    )
    assert item["url"] == "https://example.com/video/out.mp4"
    assert item["cover"] == "https://example.com/cover/out.jpg"
    assert item["duration"] == 12.34
    assert item["duration_text"] == "00:00:12"
    assert item["width"] == 1920
    assert item["height"] == 1080
    assert item["rotated"] is True
    assert item["published_at"] == format_timestamp(1_700_000_000)


def test_run_command_json():
    from video_processing_tool import run_command_json

    def fake_runner(args, capture_output, text, check):
        class Result:
            stdout = "{\"ok\": true}"

        return Result()

    assert run_command_json(["demo"], runner=fake_runner) == {"ok": True}


def test_run_ffprobe():
    from video_processing_tool import run_ffprobe

    def fake_runner(args, capture_output, text, check):
        class Result:
            stdout = json.dumps(SAMPLE)

        return Result()

    meta = run_ffprobe("demo.mp4", runner=fake_runner)
    assert meta["duration"] == 12.34


def test_build_ffmpeg_copy_args():
    from video_processing_tool import build_ffmpeg_copy_args

    args = build_ffmpeg_copy_args("in.mp4", "out.mp4", True)
    assert args[0] == "ffmpeg"
    assert "-c" in args
    assert "copy" in args
    assert "rotate=0" in args


def test_build_ffmpeg_transpose_args():
    from video_processing_tool import build_ffmpeg_transpose_args

    args = build_ffmpeg_transpose_args("in.mp4", "out.mp4", "clockwise")
    assert "transpose=1" in " ".join(args)


def test_build_thumbnail_args():
    from video_processing_tool import build_thumbnail_args

    args = build_thumbnail_args("in.mp4", "out.jpg", 20)
    assert args[0] == "ffmpeg"
    assert "2.0" in args


def test_run_ffmpeg_copy_calls_runner():
    from video_processing_tool import run_ffmpeg_copy

    captured = {}

    def fake_runner(args, check):
        captured["args"] = args

    run_ffmpeg_copy("in.mp4", "out.mp4", True, runner=fake_runner)
    assert "rotate=0" in captured["args"]


def test_run_ffmpeg_transpose_calls_runner():
    from video_processing_tool import run_ffmpeg_transpose

    captured = {}

    def fake_runner(args, check):
        captured["args"] = args

    run_ffmpeg_transpose("in.mp4", "out.mp4", "clockwise", runner=fake_runner)
    assert "transpose=1" in " ".join(captured["args"])


def test_run_thumbnail_calls_runner():
    from video_processing_tool import run_thumbnail

    captured = {}

    def fake_runner(args, check):
        captured["args"] = args

    run_thumbnail("in.mp4", "out.jpg", 20, runner=fake_runner)
    assert captured["args"][0] == "ffmpeg"


def test_collect_video_files(tmp_path):
    from video_processing_tool import collect_video_files

    (tmp_path / "a.mp4").write_text("x")
    (tmp_path / "b.txt").write_text("x")
    (tmp_path / "c.MP4").write_text("x")
    files = collect_video_files(tmp_path)
    names = [file.name for file in files]
    assert names == ["a.mp4", "c.MP4"]


def test_process_video_file_transpose(tmp_path):
    from video_processing_tool import process_video_file

    input_file = tmp_path / "in.mp4"
    input_file.write_text("x")
    output_video_dir = tmp_path / "video"
    output_cover_dir = tmp_path / "cover"
    output_video_dir.mkdir()
    output_cover_dir.mkdir()
    output_file = output_video_dir / "in.mp4"
    cover_file = output_cover_dir / "in.jpg"
    meta_map = {
        str(input_file): {"width": 1080, "height": 1920, "rotation": 0, "duration": 20},
        str(output_file): {"width": 1920, "height": 1080, "rotation": 0, "duration": 20}
    }
    calls = {"transpose": 0, "copy": 0, "thumb": 0}

    def fake_probe(path):
        return meta_map[str(path)]

    def fake_copy(src, dest, clear_rotation=False, runner=None):
        calls["copy"] += 1

    def fake_transpose(src, dest, direction, runner=None):
        calls["transpose"] += 1

    def fake_thumb(src, dest, duration, runner=None):
        calls["thumb"] += 1

    item = process_video_file(
        input_file,
        output_video_dir,
        output_cover_dir,
        "https://example.com",
        "video/",
        "cover/",
        "clockwise",
        probe_func=fake_probe,
        copy_func=fake_copy,
        transpose_func=fake_transpose,
        thumbnail_func=fake_thumb
    )
    assert calls["transpose"] == 1
    assert calls["copy"] == 0
    assert calls["thumb"] == 1
    assert item["rotated"] is True
    assert item["url"] == "https://example.com/video/in.mp4"
    assert item["cover"] == "https://example.com/cover/in.jpg"


def test_process_all_videos(tmp_path):
    from video_processing_tool import process_all_videos

    files = [tmp_path / "a.mp4", tmp_path / "b.mp4"]

    def fake_process(file_path):
        if file_path.name == "b.mp4":
            raise RuntimeError("boom")
        return {"id": file_path.name}

    items, errors = process_all_videos(files, fake_process)
    assert len(items) == 1
    assert items[0]["id"] == "a.mp4"
    assert len(errors) == 1
    assert errors[0]["path"].endswith("b.mp4")


def test_build_index_data():
    from video_processing_tool import build_index_data

    data = build_index_data([{"id": "demo"}], updated_at="2026-01-23T10:00:00+08:00")
    assert data["version"] == 1
    assert data["updated_at"] == "2026-01-23T10:00:00+08:00"
    assert data["items"][0]["id"] == "demo"


def test_check_command_exists():
    from video_processing_tool import check_command_exists

    assert check_command_exists("ffmpeg", which_func=lambda name: "ok") is True
    assert check_command_exists("ffmpeg", which_func=lambda name: None) is False


def test_write_json_file(tmp_path):
    from video_processing_tool import write_json_file

    path = tmp_path / "index.json"
    write_json_file(path, {"version": 1})
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["version"] == 1


def test_parse_args_defaults(tmp_path):
    from video_processing_tool import parse_args

    out_dir = tmp_path / "out"
    args = parse_args(["--input", "demo", "--out-dir", str(out_dir)])
    assert args.base_url == ""
    assert args.rotate == "clockwise"
    assert args.video_prefix == "video/"
    assert args.cover_prefix == "cover/"
    assert str(out_dir) in args.config
