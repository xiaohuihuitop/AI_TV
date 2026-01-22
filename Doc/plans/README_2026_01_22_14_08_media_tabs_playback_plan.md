# 媒体分栏与播放能力 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在“最新/离线”页面实现视频与图文的顶部切换，并支持播放/阅读与下载进度展示。

**Architecture:** 顶部切换仅展示一种媒体类型；点击条目跳转到播放/阅读页；下载流程更新本地进度记录，离线页展示进度并支持打开本地内容。

**Tech Stack:** uniapp（Vue 3）、JavaScript、uni 原生 API（request/downloadFile/saveFile/storage/fileSystem）。

**编码约束:** 新增注释统一以 `AI:` 开头；函数接口使用 Doxygen 风格注释并写明 `@param`/`@returns`。

### Task 1: 最新/离线页顶部媒体切换

**Files:**
- Modify: `frontend/pages/latest/index.vue`
- Modify: `frontend/pages/offline/index.vue`
- Create: `AI_TOOL/test_2026_01_22_14_08_media_tabs.js`
- Create: `AI_TOOL/test_2026_01_22_14_08_media_tabs.md`

**Step 1: Write the failing test**

```js
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pages = [
  path.join(root, "frontend", "pages", "latest", "index.vue"),
  path.join(root, "frontend", "pages", "offline", "index.vue")
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

for (const file of pages) {
  const text = fs.readFileSync(file, "utf-8");
  if (!text.includes("media-tabs")) fail(`缺少顶部切换: ${file}`);
  if (!text.includes("activeType")) fail(`缺少 activeType: ${file}`);
}

console.log("ok");
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_22_14_08_media_tabs.js`  
Expected: FAIL with "缺少顶部切换"

**Step 3: Write minimal implementation**

- 两页新增 `activeType` 状态（默认 `video`）。
- 顶部添加切换按钮（视频/图文）。
- 列表只显示当前 `activeType`。

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_22_14_08_media_tabs.js`  
Expected: PASS with "ok"

**Step 5: Commit**

```bash
git add frontend/pages/latest/index.vue frontend/pages/offline/index.vue AI_TOOL/test_2026_01_22_14_08_media_tabs.js AI_TOOL/test_2026_01_22_14_08_media_tabs.md
git commit -m "feat: 新增媒体类型顶部切换"
```

### Task 2: 新增播放与阅读页面路由

**Files:**
- Modify: `frontend/pages.json`
- Create: `frontend/pages/player/index.vue`
- Create: `frontend/pages/reader/index.vue`
- Create: `AI_TOOL/test_2026_01_22_14_08_media_pages.js`
- Create: `AI_TOOL/test_2026_01_22_14_08_media_pages.md`

**Step 1: Write the failing test**

```js
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pagesPath = path.join(root, "frontend", "pages.json");
const pages = JSON.parse(fs.readFileSync(pagesPath, "utf-8")).pages || [];
const paths = pages.map((item) => item.path);

if (!paths.includes("pages/player/index")) throw new Error("缺少 player 页面");
if (!paths.includes("pages/reader/index")) throw new Error("缺少 reader 页面");

console.log("ok");
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_22_14_08_media_pages.js`  
Expected: FAIL with "缺少 player 页面"

**Step 3: Write minimal implementation**

- 在 `pages.json` 注册 `pages/player/index` 与 `pages/reader/index`。
- 新建基础页面骨架（含标题与占位文本）。

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_22_14_08_media_pages.js`  
Expected: PASS with "ok"

**Step 5: Commit**

```bash
git add frontend/pages.json frontend/pages/player/index.vue frontend/pages/reader/index.vue AI_TOOL/test_2026_01_22_14_08_media_pages.js AI_TOOL/test_2026_01_22_14_08_media_pages.md
git commit -m "feat: 新增播放与阅读页面"
```

### Task 3: 条目点击跳转到播放/阅读页

**Files:**
- Modify: `frontend/pages/latest/index.vue`
- Modify: `frontend/pages/offline/index.vue`
- Create: `AI_TOOL/test_2026_01_22_14_08_media_nav.js`
- Create: `AI_TOOL/test_2026_01_22_14_08_media_nav.md`

**Step 1: Write the failing test**

```js
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pages = [
  path.join(root, "frontend", "pages", "latest", "index.vue"),
  path.join(root, "frontend", "pages", "offline", "index.vue")
];

for (const file of pages) {
  const text = fs.readFileSync(file, "utf-8");
  if (!text.includes("openVideo")) throw new Error(`缺少 openVideo: ${file}`);
  if (!text.includes("openArticle")) throw new Error(`缺少 openArticle: ${file}`);
  if (!text.includes("navigateTo")) throw new Error(`缺少 navigateTo: ${file}`);
}

console.log("ok");
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_22_14_08_media_nav.js`  
Expected: FAIL with "缺少 openVideo"

**Step 3: Write minimal implementation**

- 最新/离线条目增加点击事件。
- 视频跳转 `pages/player/index`，图文跳转 `pages/reader/index`。
- 传递 `title` 与 `src`（在线用 `url`，离线用 `local_path`）。

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_22_14_08_media_nav.js`  
Expected: PASS with "ok"

**Step 5: Commit**

```bash
git add frontend/pages/latest/index.vue frontend/pages/offline/index.vue AI_TOOL/test_2026_01_22_14_08_media_nav.js AI_TOOL/test_2026_01_22_14_08_media_nav.md
git commit -m "feat: 支持条目跳转播放与阅读"
```

### Task 4: 播放页面实现

**Files:**
- Modify: `frontend/pages/player/index.vue`
- Create: `AI_TOOL/test_2026_01_22_14_08_player_view.js`
- Create: `AI_TOOL/test_2026_01_22_14_08_player_view.md`

**Step 1: Write the failing test**

```js
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "frontend", "pages", "player", "index.vue");
const text = fs.readFileSync(file, "utf-8");
if (!text.includes("<video")) throw new Error("播放页缺少 video 组件");
if (!text.includes("src")) throw new Error("播放页缺少 src 绑定");
console.log("ok");
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_22_14_08_player_view.js`  
Expected: FAIL with "播放页缺少 video 组件"

**Step 3: Write minimal implementation**

- 读取 `src/title` 参数（`onLoad`）。
- `<video :src="source" controls />` 能播放在线/本地。
- 提供返回按钮（`uni.navigateBack`）。

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_22_14_08_player_view.js`  
Expected: PASS with "ok"

**Step 5: Commit**

```bash
git add frontend/pages/player/index.vue AI_TOOL/test_2026_01_22_14_08_player_view.js AI_TOOL/test_2026_01_22_14_08_player_view.md
git commit -m "feat: 实现视频播放页"
```

### Task 5: 图文阅读页面实现

**Files:**
- Create: `frontend/utils/fileService.js`
- Modify: `frontend/pages/reader/index.vue`
- Create: `AI_TOOL/test_2026_01_22_14_08_reader_view.mjs`
- Create: `AI_TOOL/test_2026_01_22_14_08_reader_view.md`

**Step 1: Write the failing test**

```js
import { readTextContent } from "../frontend/utils/fileService.js";

const memory = new Map([["file://demo.md", "hello"]]);
const adapter = {
  read: async (path) => memory.get(path)
};

const result = await readTextContent("file://demo.md", adapter);
if (result !== "hello") {
  throw new Error("读取本地文本失败");
}

console.log("ok");
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_22_14_08_reader_view.mjs`  
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

- `fileService.js` 提供 `readTextContent(src, adapter)`：
  - `src` 以 `file://` 开头时使用 `adapter.read`。
  - 否则使用 `uni.request` 拉取文本。
- 阅读页使用 `readTextContent`，展示加载/失败状态与正文。

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_22_14_08_reader_view.mjs`  
Expected: PASS with "ok"

**Step 5: Commit**

```bash
git add frontend/utils/fileService.js frontend/pages/reader/index.vue AI_TOOL/test_2026_01_22_14_08_reader_view.mjs AI_TOOL/test_2026_01_22_14_08_reader_view.md
git commit -m "feat: 实现图文阅读页"
```

### Task 6: 下载进度记录与展示

**Files:**
- Modify: `frontend/utils/offlineService.js`
- Modify: `frontend/pages/latest/index.vue`
- Modify: `frontend/pages/offline/index.vue`
- Create: `AI_TOOL/test_2026_01_22_14_08_download_progress.mjs`
- Create: `AI_TOOL/test_2026_01_22_14_08_download_progress.md`

**Step 1: Write the failing test**

```js
import { createOfflineService } from "../frontend/utils/offlineService.js";

const memory = new Map();
const storage = {
  get: (key) => memory.get(key),
  set: (key, value) => memory.set(key, value),
  remove: (key) => memory.delete(key)
};

const downloader = {
  download: async (url, onProgress) => {
    onProgress(30);
    onProgress(100);
    return { tempFilePath: `/tmp/${url.split("/").pop()}` };
  },
  save: async (tempFilePath) => ({ savedFilePath: tempFilePath.replace("/tmp/", "/saved/") })
};

const service = createOfflineService(storage, downloader);
await service.addDownload({ id: "v1", title: "demo", url: "http://x/a.mp4", type: "video" });
const list = service.listDownloads();
if (list[0].progress !== 100 || list[0].status !== "done") {
  throw new Error("进度未更新到完成状态");
}

console.log("ok");
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_22_14_08_download_progress.mjs`  
Expected: FAIL with "download is not a function"

**Step 3: Write minimal implementation**

- `offlineService.addDownload(item)` 支持 `downloader.download(url, onProgress)` 签名。
- 记录字段：`status`（`downloading/done`）、`progress`、`local_path`。
- 最新页触发下载时写入初始记录并持续更新进度。
- 离线页展示进度条（进度 < 100），完成后展示可点击项。

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_22_14_08_download_progress.mjs`  
Expected: PASS with "ok"

**Step 5: Commit**

```bash
git add frontend/utils/offlineService.js frontend/pages/latest/index.vue frontend/pages/offline/index.vue AI_TOOL/test_2026_01_22_14_08_download_progress.mjs AI_TOOL/test_2026_01_22_14_08_download_progress.md
git commit -m "feat: 支持下载进度与离线展示"
```

## Manual Verification

- 设置页填写 `index.json` 地址并保存。
- 最新页顶部切换视频/图文，点击条目进入播放/阅读页。
- 点击下载后，离线页出现进度条并在完成后可打开本地内容。
