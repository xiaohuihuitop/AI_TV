"""
AI:视频处理脚本基础函数单元测试。
"""

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
