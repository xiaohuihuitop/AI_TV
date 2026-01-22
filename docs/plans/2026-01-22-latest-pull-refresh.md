# 最新页面下拉刷新 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为最新页面加入下拉刷新，确保服务器更新后可及时刷新列表。

**Architecture:** 在 `pages.json` 为最新页面启用下拉刷新；在 `pages/latest/index.vue` 增加 `onPullDownRefresh` 钩子并复用现有 `fetchIndex`，保证刷新结束时调用 `uni.stopPullDownRefresh()`，避免并发刷新。

**Tech Stack:** uni-app + Vue 3 + JavaScript

### Task 1: 新增下拉刷新测试

**Files:**
- Create: `AI_TOOL/test_2026_01_22_19_22_pull_refresh_latest.js`
- Create: `AI_TOOL/test_2026_01_22_19_22_pull_refresh_latest.md`
- Test: `AI_TOOL/test_2026_01_22_19_22_pull_refresh_latest.js`

**Step 1: Write the failing test**

```js
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pagesPath = path.join(root, "frontend", "pages.json");
const latestPath = path.join(root, "frontend", "pages", "latest", "index.vue");

function fail(message) {
  console.error(message);
  process.exit(1);
}

const pages = JSON.parse(fs.readFileSync(pagesPath, "utf-8"));
const latestPage = (pages.pages || []).find((page) => page.path === "pages/latest/index");
if (!latestPage) fail("未找到最新页面配置");
if (latestPage.enablePullDownRefresh !== true) {
  fail("最新页面需开启 enablePullDownRefresh");
}

const latestText = fs.readFileSync(latestPath, "utf-8");
if (!/onPullDownRefresh\s*\(/.test(latestText)) {
  fail("最新页需实现 onPullDownRefresh");
}
if (!/stopPullDownRefresh/.test(latestText)) {
  fail("最新页需调用 stopPullDownRefresh");
}

console.log("ok");
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_22_19_22_pull_refresh_latest.js`
Expected: FAIL，提示未开启 `enablePullDownRefresh` 或缺少 `onPullDownRefresh`。

**Step 3: Write minimal implementation**

说明文档 `AI_TOOL/test_2026_01_22_19_22_pull_refresh_latest.md`（中文）：
- 用途：检查最新页下拉刷新开关与逻辑是否到位
- 使用方法：`node AI_TOOL/test_2026_01_22_19_22_pull_refresh_latest.js`
- 预期结果：输出 `ok`

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_22_19_22_pull_refresh_latest.js`
Expected: PASS，输出 `ok`。

**Step 5: Commit**

```bash
git add AI_TOOL/test_2026_01_22_19_22_pull_refresh_latest.js AI_TOOL/test_2026_01_22_19_22_pull_refresh_latest.md
git commit -m "test(latest): 添加下拉刷新校验"
```

### Task 2: 启用页面下拉刷新配置

**Files:**
- Modify: `frontend/pages.json`
- Test: `AI_TOOL/test_2026_01_22_19_22_pull_refresh_latest.js`

**Step 1: Write the failing test**

已在 Task 1 覆盖。

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_22_19_22_pull_refresh_latest.js`
Expected: FAIL（缺少 enablePullDownRefresh）。

**Step 3: Write minimal implementation**

在 `pages.json` 的最新页配置中添加：

```json
"enablePullDownRefresh": true,
"backgroundTextStyle": "dark"
```

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_22_19_22_pull_refresh_latest.js`
Expected: 仍可能 FAIL（缺少 `onPullDownRefresh`）。

**Step 5: Commit**

```bash
git add frontend/pages.json
git commit -m "feat(latest): 开启下拉刷新配置"
```

### Task 3: 最新页实现下拉刷新逻辑

**Files:**
- Modify: `frontend/pages/latest/index.vue`
- Test: `AI_TOOL/test_2026_01_22_19_22_pull_refresh_latest.js`

**Step 1: Write the failing test**

已在 Task 1 覆盖。

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_22_19_22_pull_refresh_latest.js`
Expected: FAIL（缺少 `onPullDownRefresh` 或 `stopPullDownRefresh`）。

**Step 3: Write minimal implementation**

在 `export default` 中新增：

```js
onPullDownRefresh() {
  if (this.loading) {
    uni.stopPullDownRefresh();
    return;
  }
  Promise.resolve(this.fetchIndex())
    .catch(() => {})
    .finally(() => {
      uni.stopPullDownRefresh();
    });
},
```

并将 `fetchIndex` 改为返回 Promise，保证调用方可 `finally` 收尾：

```js
fetchIndex() {
  const storage = createUniStorage();
  const adapter = createStorageAdapter(storage);
  const indexUrl = storage.get(indexUrlKey);
  if (!indexUrl) {
    this.error = "请在设置中填写清单地址";
    this.videoItems = [];
    this.articleItems = [];
    return Promise.resolve(false);
  }
  this.loading = true;
  this.error = "";
  return new Promise((resolve) => {
    uni.request({
      url: indexUrl,
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          adapter.setJson(indexCacheKey, res.data);
          this.applyItems(res.data);
          return;
        }
        this.applyCache(adapter);
      },
      fail: () => {
        this.applyCache(adapter);
      },
      complete: () => {
        this.loading = false;
        resolve(true);
      }
    });
  });
}
```

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_22_19_22_pull_refresh_latest.js`
Expected: PASS，输出 `ok`。

**Step 5: Commit**

```bash
git add frontend/pages/latest/index.vue
git commit -m "feat(latest): 添加下拉刷新逻辑"
```

### Task 4: 全量测试回归

**Files:**
- Test: `AI_TOOL/test_*.js`

**Step 1: Run tests**

Run:

```bash
$tests = Get-ChildItem -Path AI_TOOL -Filter 'test_*.js' | Sort-Object Name; $fail = $false; foreach ($t in $tests) { Write-Host "Running $($t.Name)"; node $t.FullName; if ($LASTEXITCODE -ne 0) { $fail = $true; break } }; if ($fail) { exit 1 }
```

Expected: 全部输出 `ok`。

**Step 2: Commit**

```bash
git status -sb
```

确认无遗漏变更即可。
```