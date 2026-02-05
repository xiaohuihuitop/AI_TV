# 移除视频旋转与重处理 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 移除服务端视频“旋转/重新处理”链路，仅保留封面抽取与时长/宽高获取。

**Architecture:** 保留现有后台 worker 处理链路，`process_video` 只执行 ffprobe 元数据读取与封面抽取，不再物理旋转或清理旋转元数据；后台视频列表移除“重新处理”入口，避免触发重处理。

**Tech Stack:** Python 3、FastAPI、SQLAlchemy、Jinja2、ffmpeg/ffprobe。

---

### Task 1: 移除后台“重新处理”入口

**Files:**
- Modify: `server/app/web/routes.py`
- Modify: `server/app/templates/videos.html`

**Step 1:（如需）补充失败测试说明**
当前项目无现成 Web 路由测试基建，本任务不新增测试用例，改用手动验证覆盖。

**Step 2: 移除路由处理函数**
在 `server/app/web/routes.py` 删除 `@router.post("/videos/{video_id}/reprocess")` 与 `video_reprocess` 实现：

```python
# 删除整个 video_reprocess 处理函数块
```

**Step 3: 移除列表按钮**
在 `server/app/templates/videos.html` 删除“重新处理”表单：

```html
<!-- 删除此块 -->
<form class="inline-form" method="post" action="/web/videos/{{ v.id }}/reprocess" onsubmit="return confirm('确定重新处理该视频吗？')">
  <button class="btn ghost" type="submit">重新处理</button>
</form>
```

**Step 4: 手动验证**
- 打开 `/web/videos`，确认按钮消失。
- 刷新视频详情页，确认无相关入口。

**Step 5: 提交**
```bash
git add server/app/web/routes.py server/app/templates/videos.html
git commit -m "chore: 移除视频重处理入口"
```

---

### Task 2: 移除旋转逻辑，仅保留封面/元数据

**Files:**
- Modify: `server/app/services/video_processing.py`

**Step 1:（如需）补充失败测试说明**
该模块依赖 ffmpeg/ffprobe 与真实视频文件，当前无测试基建与样例，先不新增自动化测试，改为手动验证。

**Step 2: 简化 probe 与 process**
更新 `process_video` 只做“元数据 + 封面抽取”，并移除旋转相关函数与 rotate 字段解析：

```python
def probe_video(path: Path) -> dict:
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
    ...
    return {"width": width, "height": height, "duration": duration}


def process_video(path: Path, cover_path: Path) -> dict:
    info = probe_video(path)
    extract_cover(path, info["duration"] * 0.1, cover_path)
    return info
```

同时删除 `rotate_if_needed` 与 `_resolve_rotate` 函数。

**Step 3: 手动验证**
- 上传一个新视频，等待 worker 生成封面。
- 确认视频文件未被物理旋转（文件大小变化不明显、播放方向保持原始）。
- 后台仍能看到时长与封面。

**Step 4: 提交**
```bash
git add server/app/services/video_processing.py
git commit -m "chore: 移除视频旋转处理"
```

---

### Task 3: 更新项目文档记录

**Files:**
- Modify: `docs/project/需求.md`
- Modify: `docs/project/计划.md`
- Modify: `docs/project/进度.md`

**Step 1: 需求变更记录**
在 `需求.md` 的“变更记录”追加一行：
- 2026-02-05 | 移除视频旋转/重处理，仅保留封面与元数据 | 用户需求 | server/web

**Step 2: 计划变更记录**
在 `计划.md` 的“变更记录”追加一行同上。

**Step 3: 进度追加**
在 `进度.md` 追加当日记录，说明：已移除重处理入口与旋转逻辑，保留封面/元数据。

**Step 4: 提交**
```bash
git add docs/project/需求.md docs/project/计划.md docs/project/进度.md
git commit -m "docs: 记录移除视频旋转与重处理"
```
