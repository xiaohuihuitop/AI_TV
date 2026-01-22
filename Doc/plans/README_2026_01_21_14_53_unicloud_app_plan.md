# UniCloud 静态清�?App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** �?uniapp 中实现“最�?离线/设置”三页，读取 UniCloud 云存�?`index.json` 并支持离线下载与管理�?

**Architecture:** App 通过 `index_url` 拉取清单并本地缓存；下载时保存到本地文件并维护离线列表；所有逻辑通过可注入的工具函数与存储适配器解耦，便于测试�?

**Tech Stack:** uniapp（Vue 3 语法）、JavaScript、uni 原生 API（request/downloadFile/saveFile/storage）�?

**编码约束:** 新增注释统一�?`AI:` 开头；函数接口使用 Doxygen 风格注释并写�?`@param`/`@returns`�?

### Task 1: 初始�?uniapp 基础结构�?Tab �?

**Files:**
- Create: `frontend/manifest.json`
- Create: `frontend/pages.json`
- Create: `frontend/App.vue`
- Create: `frontend/main.js`
- Create: `frontend/uni.scss`
- Create: `frontend/pages/latest/index.vue`
- Create: `frontend/pages/offline/index.vue`
- Create: `frontend/pages/settings/index.vue`
- Create: `AI_TOOL/test_2026_01_21_14_53_uni_scaffold.js`
- Create: `AI_TOOL/test_2026_01_21_14_53_uni_scaffold.md`

**Step 1: Write the failing test**

```js
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pagesPath = path.join(root, "frontend", "pages.json");
const requiredPages = [
  "pages/latest/index",
  "pages/offline/index",
  "pages/settings/index"
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(pagesPath)) {
  fail("pages.json 不存�?);
}

const pages = JSON.parse(fs.readFileSync(pagesPath, "utf-8"));
const pagePaths = (pages.pages || []).map((item) => item.path);
for (const page of requiredPages) {
  if (!pagePaths.includes(page)) {
    fail(`缺少页面: ${page}`);
  }
}

const tabs = (pages.tabBar && pages.tabBar.list) || [];
if (tabs.length !== 3) {
  fail("tabBar 数量不为 3");
}

console.log("ok");
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_21_14_53_uni_scaffold.js`  
Expected: FAIL with "pages.json 不存�?

**Step 3: Write minimal implementation**

```json
{
  "pages": [
    { "path": "pages/latest/index", "style": { "navigationBarTitleText": "最�? } },
    { "path": "pages/offline/index", "style": { "navigationBarTitleText": "离线" } },
    { "path": "pages/settings/index", "style": { "navigationBarTitleText": "设置" } }
  ],
  "tabBar": {
    "list": [
      { "pagePath": "pages/latest/index", "text": "最�? },
      { "pagePath": "pages/offline/index", "text": "离线" },
      { "pagePath": "pages/settings/index", "text": "设置" }
    ]
  }
}
```

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_21_14_53_uni_scaffold.js`  
Expected: PASS with "ok"

**Step 5: Commit**

```bash
git add frontend AI_TOOL/test_2026_01_21_14_53_uni_scaffold.js AI_TOOL/test_2026_01_21_14_53_uni_scaffold.md
git commit -m "feat: 初始�?uniapp 基础结构"
```

### Task 2: 清单解析与设�?缓存存储适配

**Files:**
- Create: `frontend/utils/indexService.js`
- Create: `AI_TOOL/test_2026_01_21_14_53_index_service.mjs`
- Create: `AI_TOOL/test_2026_01_21_14_53_index_service.md`

**Step 1: Write the failing test**

```js
const { normalizeIndexItems, createStorageAdapter } = require("../frontend/utils/indexService.js");

const raw = {
  items: [
    { id: "b", type: "video", title: "B", published_at: "2026-01-21T10:00:00+08:00" },
    { id: "a", type: "article", title: "A", published_at: "2026-01-21T12:00:00+08:00" }
  ]
};

const { items } = normalizeIndexItems(raw);
if (items[0].id !== "a") {
  throw new Error("排序未按 published_at 倒序");
}

const memory = new Map();
const adapter = createStorageAdapter({
  get: (key) => memory.get(key),
  set: (key, value) => memory.set(key, value),
  remove: (key) => memory.delete(key)
});

adapter.setJson("index_cache", raw);
const cached = adapter.getJson("index_cache");
if (!cached || cached.items.length !== 2) {
  throw new Error("缓存写入/读取失败");
}

console.log("ok");
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_21_14_53_index_service.mjs`  
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```js
function normalizeIndexItems(raw) {
  const items = Array.isArray(raw?.items) ? raw.items.slice() : [];
  items.sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || "")));
  return { items };
}

function createStorageAdapter({ get, set, remove }) {
  return {
    getJson(key) {
      const value = get(key);
      return value ? JSON.parse(value) : null;
    },
    setJson(key, value) {
      set(key, JSON.stringify(value));
    },
    remove(key) {
      remove(key);
    }
  };
}

module.exports = { normalizeIndexItems, createStorageAdapter };
```

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_21_14_53_index_service.mjs`  
Expected: PASS with "ok"

**Step 5: Commit**

```bash
git add frontend/utils AI_TOOL/test_2026_01_21_14_53_index_service.mjs AI_TOOL/test_2026_01_21_14_53_index_service.md
git commit -m "feat: 增加清单解析与本地存储适配"
```

### Task 3: 离线下载与离线列表存�?

**Files:**
- Create: `frontend/utils/offlineService.js`
- Create: `AI_TOOL/test_2026_01_21_14_53_offline_service.mjs`
- Create: `AI_TOOL/test_2026_01_21_14_53_offline_service.md`

**Step 1: Write the failing test**

```js
const { createOfflineService } = require("../frontend/utils/offlineService.js");

const memory = new Map();
const storage = {
  get: (key) => memory.get(key),
  set: (key, value) => memory.set(key, value),
  remove: (key) => memory.delete(key)
};

const downloader = {
  download: async (url) => ({ tempFilePath: `/tmp/${url.split("/").pop()}` }),
  save: async (tempFilePath) => ({ savedFilePath: tempFilePath.replace("/tmp/", "/saved/") })
};

const service = createOfflineService(storage, downloader);
await service.addDownload({ id: "v1", title: "demo", url: "http://x/a.mp4" });
const list = service.listDownloads();
if (list.length !== 1 || !list[0].local_path) {
  throw new Error("离线列表未写�?);
}
await service.removeDownload("v1");
if (service.listDownloads().length !== 0) {
  throw new Error("离线删除失败");
}

console.log("ok");
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_21_14_53_offline_service.mjs`  
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```js
function createOfflineService(storage, downloader) {
  const key = "download_items";

  function listDownloads() {
    const value = storage.get(key);
    return value ? JSON.parse(value) : [];
  }

  function save(list) {
    storage.set(key, JSON.stringify(list));
  }

  async function addDownload(item) {
    const result = await downloader.download(item.url);
    const saved = await downloader.save(result.tempFilePath);
    const list = listDownloads();
    list.unshift({
      ...item,
      local_path: saved.savedFilePath,
      downloaded_at: new Date().toISOString()
    });
    save(list);
  }

  async function removeDownload(id) {
    const list = listDownloads().filter((item) => item.id !== id);
    save(list);
  }

  return { listDownloads, addDownload, removeDownload };
}

module.exports = { createOfflineService };
```

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_21_14_53_offline_service.mjs`  
Expected: PASS with "ok"

**Step 5: Commit**

```bash
git add frontend/utils/offlineService.js AI_TOOL/test_2026_01_21_14_53_offline_service.mjs AI_TOOL/test_2026_01_21_14_53_offline_service.md
git commit -m "feat: 增加离线下载与存储服�?
```

### Task 4: 页面接入与基础交互

**Files:**
- Modify: `frontend/pages/latest/index.vue`
- Modify: `frontend/pages/offline/index.vue`
- Modify: `frontend/pages/settings/index.vue`
- Create: `AI_TOOL/test_2026_01_21_14_53_page_wiring.js`
- Create: `AI_TOOL/test_2026_01_21_14_53_page_wiring.md`

**Step 1: Write the failing test**

```js
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function contains(file, keyword) {
  const text = fs.readFileSync(file, "utf-8");
  return text.includes(keyword);
}

const latest = path.join(root, "frontend", "pages", "latest", "index.vue");
const offline = path.join(root, "frontend", "pages", "offline", "index.vue");
const settings = path.join(root, "frontend", "pages", "settings", "index.vue");

if (!contains(latest, "fetchIndex")) throw new Error("最新页未接�?fetchIndex");
if (!contains(latest, "addDownload")) throw new Error("最新页未接�?addDownload");
if (!contains(offline, "listDownloads")) throw new Error("离线页未接入 listDownloads");
if (!contains(offline, "removeDownload")) throw new Error("离线页未接入 removeDownload");
if (!contains(settings, "index_url")) throw new Error("设置页未接入 index_url");

console.log("ok");
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_21_14_53_page_wiring.js`  
Expected: FAIL with "未接�?

**Step 3: Write minimal implementation**

在三个页面中接入服务�?
- 最新页：加载清单、渲染列表、点击下载调�?`addDownload`�?
- 离线页：读取 `listDownloads`，删除调�?`removeDownload`�?
- 设置页：编辑并保�?`index_url`�?

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_21_14_53_page_wiring.js`  
Expected: PASS with "ok"

**Step 5: Commit**

```bash
git add frontend/pages AI_TOOL/test_2026_01_21_14_53_page_wiring.js AI_TOOL/test_2026_01_21_14_53_page_wiring.md
git commit -m "feat: 接入清单与离线逻辑到页�?
```

## Manual Verification

- �?HBuilderX 打开 `frontend/`，运行到 Android�?
- 最新页加载 `index.json` 并显示列表�?
- 点击下载后，离线页可见并可删除�?
- 设置页可修改 `index_url` 并刷新生效�?
