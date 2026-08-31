# 服务端手机播放器预览 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在服务端视频管理页以弹窗手机模型播放 ready 视频，并准确展示横竖屏布局及上一个、返回、下一个按钮状态。

**Architecture:** 页面不新增后端接口或持久化数据。`videos.html` 为 ready 条目输出预览触发器与语义化 `<dialog>`；`mobile-preview.js` 从这些触发器构建当前筛选结果内的队列，负责弹窗、播放、方向和前后切换；`app.css` 按 Android 沉浸播放器的深色底部操作栏设计手机模型。

**Tech Stack:** FastAPI、Jinja2、原生 HTML `<dialog>`、原生 JavaScript、CSS、FastAPI TestClient、浏览器手工验证。

---

### Task 1: 先建立服务端页面回归测试

**Files:**
- Modify: `AI_TOOL/server_admin_features_test.py`
- Modify: `server/app/templates/videos.html`（下一任务）
- Create: `server/app/static/mobile-preview.js`（下一任务）

- [x] **Step 1: 为测试辅助函数补充视频尺寸参数**

```python
def add_video(app, filename, status="ready", description="none", width=None, height=None):
    # 保留原有文件和记录创建逻辑。
    video = Video(
        filename=filename,
        path=str(video_path),
        status=status,
        description=description,
        width=width,
        height=height,
        created_at="2026-06-03T00:00:00",
    )
```

- [x] **Step 2: 写入会失败的预览结构测试**

```python
def test_ready_videos_expose_mobile_preview_queue_only():
    tmp, app, client = make_client()
    try:
        ready_id = add_video(app, "landscape.mp4", width=1920, height=1080)
        add_video(app, "waiting.mp4", status="pending", width=1080, height=1920)
        page = client.get("/web/videos", headers=AUTH_HEADERS)
        assert page.status_code == 200
        assert f'data-mobile-preview-id="{ready_id}"' in page.text
        assert 'data-mobile-preview-title="landscape.mp4"' in page.text
        assert 'data-mobile-preview-width="1920"' in page.text
        assert 'data-mobile-preview-title="waiting.mp4"' not in page.text
        assert 'id="mobile-preview-dialog"' in page.text
        assert '/static/mobile-preview.js' in page.text
    finally:
        cleanup_client(app, tmp)
```

- [x] **Step 3: 运行测试确认红灯**

Run: `python AI_TOOL/server_admin_features_test.py`

Expected: `test_ready_videos_expose_mobile_preview_queue_only` 失败，因为当前模板没有预览触发器、对话框或脚本。

### Task 2: 输出预览触发器和语义化弹窗

**Files:**
- Modify: `server/app/templates/videos.html`
- Test: `AI_TOOL/server_admin_features_test.py`

- [x] **Step 1: 仅对 ready 视频添加预览按钮**

在 `.video-management-actions` 中、详情按钮之前添加：

```html
{% if v.status == 'ready' %}
  <button
    class="btn ghost mobile-preview-trigger"
    type="button"
    data-mobile-preview
    data-mobile-preview-id="{{ v.id }}"
    data-mobile-preview-title="{{ v.filename }}"
    data-mobile-preview-src="/api/videos/{{ v.id }}/download"
    data-mobile-preview-width="{{ v.width or 0 }}"
    data-mobile-preview-height="{{ v.height or 0 }}"
  >手机预览</button>
{% endif %}
```

- [x] **Step 2: 在页面内容结尾添加一个可访问对话框**

```html
<dialog id="mobile-preview-dialog" class="mobile-preview-dialog" aria-labelledby="mobile-preview-title">
  <div class="mobile-preview-dialog-head">
    <h2 id="mobile-preview-title">手机播放预览</h2>
    <button class="icon-btn" type="button" data-mobile-preview-close aria-label="关闭手机预览">×</button>
  </div>
  <div class="mobile-preview-phone" data-mobile-preview-phone>
    <div class="mobile-preview-screen">
      <video data-mobile-preview-video controls preload="metadata"></video>
      <p class="mobile-preview-error" data-mobile-preview-error hidden></p>
    </div>
    <div class="mobile-preview-actions">
      <button type="button" data-mobile-preview-prev>上一个</button>
      <button type="button" class="is-back" data-mobile-preview-back>返回</button>
      <button type="button" data-mobile-preview-next>下一个</button>
    </div>
  </div>
</dialog>
<script src="/static/mobile-preview.js"></script>
```

- [x] **Step 3: 再次运行页面回归测试确认绿灯**

Run: `python AI_TOOL/server_admin_features_test.py`

Expected: `server admin features ok`。

### Task 3: 实现弹窗播放器队列和停止行为

**Files:**
- Create: `server/app/static/mobile-preview.js`
- Test: `AI_TOOL/server_admin_features_test.py`

- [x] **Step 1: 写入会失败的脚本资源断言**

在 `test_ready_videos_expose_mobile_preview_queue_only` 末尾添加：

```python
script = client.get("/static/mobile-preview.js", headers=AUTH_HEADERS)
assert script.status_code == 200
assert "dialog.showModal()" in script.text
assert "previewVideo.pause()" in script.text
assert "is-landscape" in script.text
assert "updateNavigation" in script.text
```

- [x] **Step 2: 运行测试确认红灯**

Run: `python AI_TOOL/server_admin_features_test.py`

Expected: 新的静态资源断言失败，因为脚本尚不存在。

- [x] **Step 3: 新建最小预览控制器**

```javascript
(() => {
  const triggers = Array.from(document.querySelectorAll("[data-mobile-preview]"));
  const dialog = document.querySelector("#mobile-preview-dialog");
  if (!dialog || triggers.length === 0) return;

  const playlist = triggers.map((trigger) => ({
    id: trigger.dataset.mobilePreviewId,
    title: trigger.dataset.mobilePreviewTitle,
    src: trigger.dataset.mobilePreviewSrc,
    width: Number(trigger.dataset.mobilePreviewWidth || 0),
    height: Number(trigger.dataset.mobilePreviewHeight || 0),
    trigger,
  }));
  const previewTitle = dialog.querySelector("#mobile-preview-title");
  const previewPhone = dialog.querySelector("[data-mobile-preview-phone]");
  const previewVideo = dialog.querySelector("[data-mobile-preview-video]");
  const previewError = dialog.querySelector("[data-mobile-preview-error]");
  const previous = dialog.querySelector("[data-mobile-preview-prev]");
  const next = dialog.querySelector("[data-mobile-preview-next]");
  const back = dialog.querySelector("[data-mobile-preview-back]");
  const close = dialog.querySelector("[data-mobile-preview-close]");
  let activeIndex = -1;
  let opener = null;

  function updateNavigation() {
    previous.disabled = activeIndex <= 0;
    next.disabled = activeIndex < 0 || activeIndex >= playlist.length - 1;
  }

  function displayItem(index) {
    activeIndex = index;
    const item = playlist[index];
    previewTitle.textContent = `手机播放预览：${item.title}`;
    previewPhone.classList.toggle("is-landscape", item.width > item.height);
    previewError.hidden = true;
    previewVideo.pause();
    previewVideo.removeAttribute("src");
    previewVideo.src = item.src;
    previewVideo.load();
    updateNavigation();
  }

  function openAt(index) {
    opener = playlist[index].trigger;
    displayItem(index);
    dialog.showModal();
    close.focus();
  }

  function closePreview() {
    if (dialog.open) dialog.close();
  }

  triggers.forEach((trigger, index) => trigger.addEventListener("click", () => openAt(index)));
  previous.addEventListener("click", () => displayItem(activeIndex - 1));
  next.addEventListener("click", () => displayItem(activeIndex + 1));
  back.addEventListener("click", closePreview);
  close.addEventListener("click", closePreview);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closePreview();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closePreview();
    }
  });
  dialog.addEventListener("close", () => {
    previewVideo.pause();
    previewVideo.removeAttribute("src");
    previewVideo.load();
    activeIndex = -1;
    updateNavigation();
    if (opener) opener.focus();
    opener = null;
  });
  previewVideo.addEventListener("error", () => {
    const item = playlist[activeIndex];
    previewError.textContent = item ? `无法播放：${item.title}` : "无法播放视频";
    previewError.hidden = false;
  });
})();
```

- [x] **Step 4: 运行测试确认绿灯**

Run: `python AI_TOOL/server_admin_features_test.py`

Expected: `server admin features ok`。

### Task 4: 实现手机模型样式与响应式布局

**Files:**
- Modify: `server/app/static/app.css`
- Test: `AI_TOOL/server_admin_features_test.py`

- [x] **Step 1: 写入会失败的 CSS 标记断言**

在预览测试中读取静态 CSS 并断言：

```python
css = client.get("/static/app.css", headers=AUTH_HEADERS)
assert css.status_code == 200
assert ".mobile-preview-dialog" in css.text
assert ".mobile-preview-phone.is-landscape" in css.text
assert "object-fit: contain" in css.text
assert ".mobile-preview-actions" in css.text
```

- [x] **Step 2: 运行测试确认红灯**

Run: `python AI_TOOL/server_admin_features_test.py`

Expected: 新 CSS 标记断言失败，因为手机预览样式尚不存在。

- [x] **Step 3: 增加手机外框、视频舞台和底部操作条**

样式必须满足以下固定结构：

```css
.mobile-preview-trigger { white-space: nowrap; }
.mobile-preview-dialog {
  width: min(calc(100vw - 32px), 640px);
  max-height: calc(100dvh - 32px);
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
  color: var(--ink);
  box-shadow: 0 24px 56px rgba(16, 24, 28, 0.36);
}
.mobile-preview-dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}
.mobile-preview-dialog-head h2 { margin: 0; font-size: 18px; }
.mobile-preview-dialog .icon-btn {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: var(--ink);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}
.mobile-preview-dialog > .mobile-preview-phone { margin: 16px; }
.mobile-preview-error {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 16px;
  color: #fff;
  background: rgba(0, 0, 0, 0.72);
  text-align: center;
}
.mobile-preview-dialog button:focus-visible {
  outline: 3px solid #4b9b84;
  outline-offset: 2px;
}
.mobile-preview-phone {
  width: min(100%, 300px);
  aspect-ratio: 9 / 18.6;
  margin: 0 auto;
  display: grid;
  grid-template-rows: minmax(0, 1fr) 76px;
  border: 7px solid #0b0d0e;
  border-radius: 30px;
  overflow: hidden;
  background: #000;
}
.mobile-preview-phone.is-landscape {
  width: min(100%, 560px);
  aspect-ratio: 16 / 11.4;
  border-radius: 22px;
}
.mobile-preview-screen {
  position: relative;
  min-height: 0;
  background: #000;
}
.mobile-preview-screen video {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  background: #000;
}
.mobile-preview-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 8px;
  background: #171b1e;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
}
.mobile-preview-actions button {
  min-width: 0;
  min-height: 48px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 6px;
  background: #343a3f;
  color: #fffaf4;
  font: inherit;
  font-weight: 700;
}
.mobile-preview-actions .is-back { background: #286953; border-color: #4b9b84; }
.mobile-preview-actions button:disabled { cursor: not-allowed; opacity: 0.45; }
.mobile-preview-dialog::backdrop { background: rgba(16, 24, 28, 0.7); }
@media (max-width: 640px) {
  .mobile-preview-dialog { width: calc(100vw - 24px); }
  .mobile-preview-dialog > .mobile-preview-phone { margin: 12px; }
  .mobile-preview-phone.is-landscape { width: 100%; border-width: 5px; }
}
```

使用现有后台 CSS 变量，模态框圆角不超过 8px；手机边框可使用更大的设备圆角。

- [x] **Step 4: 运行测试确认绿灯**

Run: `python AI_TOOL/server_admin_features_test.py`

Expected: `server admin features ok`。

### Task 5: 完整回归与浏览器验收

**Files:**
- Modify: `docs/project/需求.md`
- Modify: `docs/project/计划.md`
- Modify: `docs/project/进度.md`
- Modify: `docs/project/总结.md`
- Modify: `docs/project/项目总览.md`
- Modify: `docs/memory/当前状态.md`
- Modify: `ai_knowledge.md`（仅在发现并解决可复用问题时）

- [x] **Step 1: 运行完整服务端回归**

Run:

```powershell
python AI_TOOL/server_admin_features_test.py
python AI_TOOL/server_reliability_test.py
node AI_TOOL/range_parse_test.mjs
python -m compileall -q server/app server/scripts
git diff --check
```

Expected: 所有命令退出码为 0。

- [ ] **Step 2: 浏览器验收**

使用本地临时数据启动服务，在 375px 宽度打开 `/web/videos` 并检查：

1. ready 条目显示“手机预览”，非 ready 条目不显示。
2. 横向和纵向条目切换对应的手机模型方向，视频完整显示。
3. 第一个条目禁用“上一个”，最后一个禁用“下一个”，中间条目可以双向切换。
4. 返回、关闭、Escape 和遮罩点击都停止视频并回到原预览按钮。

已完成 375px 下 ready 入口、横竖屏方向、视频元数据、`contain`、首尾禁用以及鼠标关闭路径的自动化验收。内置浏览器没有向页面派发 Escape 且缓存了最后一次 CSS 变更，因此 Esc 和最终横屏比例保留给部署后的真实浏览器手工确认。

- [x] **Step 3: 回填项目记录**

在需求、计划、进度和总结中记录手机播放器预览功能；项目总览登记最近更新。轮换 `docs/memory/当前状态.md` 到新目标，并仅在发现通用问题时新增 `ai_knowledge.md` 条目。

- [x] **Step 4: Git 操作边界**

本计划不执行 `git add`、`git commit`、tag 或 push。当前工作区包含用户未提交的 Android 与服务端可靠性改动，且仓库规则要求 Git 历史操作先取得用户确认。
