# 视频处理脚本 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 编写一个可批量处理 mp4 的脚本，自动判断是否需要旋转 90 度、生成 10% 缩略图，并输出包含封面与时长的 index.json。

**Architecture:** 脚本以 Python CLI 形式运行，使用 ffprobe 读取元数据，基于显示宽高判断旋转策略，必要时用 ffmpeg 旋转并重编码；生成缩略图与配置文件时统一从输出文件读取最终元数据，确保准确。

**Tech Stack:** Python 3、ffprobe/ffmpeg、pytest（用于纯函数单元测试）。

### Task 1: 基础辅助函数与单元测试

**Files:**
- Create: `AI_TOOL/video_processing_tool.py`
- Create: `AI_TOOL/test_2026_01_23_18_10_video_processing.py`
- Create: `AI_TOOL/test_2026_01_23_18_10_video_processing.md`
- Test: `AI_TOOL/test_2026_01_23_18_10_video_processing.py`

**Step 1: Write the failing test**

```python
import os
import sys
import pytest

CURRENT_DIR = os.path.dirname(__file__)
sys.path.insert(0, CURRENT_DIR)

from video_processing_tool import format_duration, compute_display_dimensions

def test_format_duration():
    assert format_duration(0) == "00:00:00"
    assert format_duration(61.2) == "00:01:01"
    assert format_duration(3661) == "01:01:01"


def test_compute_display_dimensions_rotate():
    width, height = compute_display_dimensions(1920, 1080, 90)
    assert (width, height) == (1080, 1920)
```

**Step 2: Run test to verify it fails**

Run: `pytest AI_TOOL/test_2026_01_23_18_10_video_processing.py -q`
Expected: FAIL with "ImportError" or "function not defined"

**Step 3: Write minimal implementation**

```python
import math

def format_duration(seconds):
    total = int(math.floor(max(0, seconds)))
    hours = total // 3600
    minutes = (total % 3600) // 60
    secs = total % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def compute_display_dimensions(width, height, rotation):
    normalized = (rotation or 0) % 360
    if normalized in (90, 270):
        return height, width
    return width, height
```

**Step 4: Run test to verify it passes**

Run: `pytest AI_TOOL/test_2026_01_23_18_10_video_processing.py -q`
Expected: PASS

**Step 5: Commit**

```bash
git add AI_TOOL/video_processing_tool.py AI_TOOL/test_2026_01_23_18_10_video_processing.py AI_TOOL/test_2026_01_23_18_10_video_processing.md
git commit -m "test: 添加视频处理基础测试"
```

### Task 2: ffprobe 解析与旋转策略

**Files:**
- Modify: `AI_TOOL/video_processing_tool.py`
- Modify: `AI_TOOL/test_2026_01_23_18_10_video_processing.py`
- Test: `AI_TOOL/test_2026_01_23_18_10_video_processing.py`

**Step 1: Write the failing test**

```python
from video_processing_tool import parse_ffprobe_json, decide_rotation_strategy

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
    meta = parse_ffprobe_json(SAMPLE)
    assert meta["width"] == 1920
    assert meta["height"] == 1080
    assert meta["rotation"] == 90
    assert meta["duration"] == 12.34


def test_decide_rotation_strategy_clear_metadata():
    strategy = decide_rotation_strategy(1920, 1080, 90)
    assert strategy == "clear_metadata"
```

**Step 2: Run test to verify it fails**

Run: `pytest AI_TOOL/test_2026_01_23_18_10_video_processing.py -q`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

```python

def parse_rotation_value(stream):
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
    display_width, display_height = compute_display_dimensions(width, height, rotation)
    if display_height <= display_width:
        return "none"
    if width >= height and (rotation or 0) % 360 in (90, 270):
        return "clear_metadata"
    return "transpose"
```

**Step 4: Run test to verify it passes**

Run: `pytest AI_TOOL/test_2026_01_23_18_10_video_processing.py -q`
Expected: PASS

**Step 5: Commit**

```bash
git add AI_TOOL/video_processing_tool.py AI_TOOL/test_2026_01_23_18_10_video_processing.py
git commit -m "feat: 添加ffprobe解析与旋转策略"
```

### Task 3: 处理流程、缩略图与配置输出

**Files:**
- Modify: `AI_TOOL/video_processing_tool.py`
- Modify: `AI_TOOL/test_2026_01_23_18_10_video_processing.md`

**Step 1: Implement CLI and processing pipeline**

```python
import argparse
import datetime
import json
import os
import shutil
import subprocess
from pathlib import Path


def run_ffprobe(path):
    args = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,side_data_list:stream_tags=rotate",
        "-show_entries", "format=duration",
        "-of", "json",
        str(path)
    ]
    result = subprocess.run(args, capture_output=True, text=True, check=True)
    return parse_ffprobe_json(json.loads(result.stdout))


def run_ffmpeg_copy(src, dest, clear_rotation=False):
    args = ["ffmpeg", "-y", "-i", str(src), "-c", "copy"]
    if clear_rotation:
        args += ["-metadata:s:v:0", "rotate=0"]
    args.append(str(dest))
    subprocess.run(args, check=True)


def run_ffmpeg_transpose(src, dest, direction):
    transpose = "1" if direction == "clockwise" else "2"
    args = [
        "ffmpeg", "-y", "-i", str(src),
        "-vf", f"transpose={transpose}",
        "-c:v", "libx264", "-c:a", "aac", "-metadata:s:v:0", "rotate=0",
        str(dest)
    ]
    subprocess.run(args, check=True)


def generate_thumbnail(src, dest, duration):
    seek = max(duration * 0.1, 1.0)
    args = ["ffmpeg", "-y", "-ss", str(seek), "-i", str(src), "-frames:v", "1", str(dest)]
    subprocess.run(args, check=True)
```

**Step 2: Add config generation**

```python

def build_item(file_path, output_path, cover_path, base_url, meta, rotated, video_prefix, cover_prefix):
    name = output_path.stem
    published_at = datetime.datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
    display_width, display_height = compute_display_dimensions(meta["width"], meta["height"], 0)
    return {
        "id": f"vid-{name}",
        "type": "video",
        "title": name,
        "published_at": published_at,
        "url": f"{base_url.rstrip('/')}/{video_prefix}{output_path.name}",
        "cover": f"{base_url.rstrip('/')}/{cover_prefix}{cover_path.name}",
        "duration": round(meta["duration"], 2),
        "duration_text": format_duration(meta["duration"]),
        "width": display_width,
        "height": display_height,
        "rotated": rotated
    }
```

**Step 3: Manual verification**

Run: `python AI_TOOL/video_processing_tool.py --input tv_data --out-dir output --base-url https://example.com --config output/index.json`
Expected:
- `output/video/*.mp4` 输出文件存在
- `output/cover/*.jpg` 缩略图存在
- `output/index.json` 中每条包含 `cover`、`duration`、`duration_text`

**Step 4: Commit**

```bash
git add AI_TOOL/video_processing_tool.py AI_TOOL/test_2026_01_23_18_10_video_processing.md
git commit -m "feat: 完成视频处理脚本"
```

### Task 4: 补充使用说明

**Files:**
- Modify: `AI_TOOL/test_2026_01_23_18_10_video_processing.md`

**Step 1: Write usage note**

```markdown
用途：批量处理 mp4，旋转为横屏并生成缩略图与 index.json。
使用方法：python AI_TOOL/video_processing_tool.py --input tv_data --out-dir output --base-url https://example.com --config output/index.json
预期结果：输出视频、封面与 index.json 完整生成。
```

**Step 2: Commit**

```bash
git add AI_TOOL/test_2026_01_23_18_10_video_processing.md
git commit -m "docs: 补充视频处理脚本说明"
```