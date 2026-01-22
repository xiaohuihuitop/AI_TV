# 影院质感 UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 AI_TV 前端统一影院质感暗色视觉与动效，提升层级、可读性与沉浸感。

**Architecture:** 先在全局样式中落地暗色主题与动效，再分页面补齐卡片/按钮/列表等细节样式与结构。每一步通过脚本校验关键类名与主题变量，确保变更可控。

**Tech Stack:** uniapp（Vue 3）、SCSS、原生组件样式、Node 测试脚本

### Task 1: 全局主题与导航栏视觉

**Files:**
- Modify: `frontend/uni.scss`
- Modify: `frontend/pages.json`
- Create: `AI_TOOL/test_2026_01_22_17_34_cinematic_theme.js`
- Create: `AI_TOOL/test_2026_01_22_17_34_cinematic_theme.md`

**Step 1: Write the failing test**

```js
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const scss = fs.readFileSync(path.join(root, "frontend", "uni.scss"), "utf-8");
const requiredTokens = [
  "--color-bg",
  "--color-surface",
  "--color-text",
  "--color-accent",
  "--font-display",
  "--font-body"
];

requiredTokens.forEach((token) => {
  if (!scss.includes(token)) throw new Error(`缺少主题变量: ${token}`);
});

if (!scss.includes("linear-gradient")) throw new Error("缺少背景渐变");

const pages = JSON.parse(fs.readFileSync(path.join(root, "frontend", "pages.json"), "utf-8"));
if (pages.globalStyle.navigationBarTextStyle !== "white") {
  throw new Error("导航栏文字需为白色");
}
if (pages.globalStyle.navigationBarBackgroundColor !== "#0b0d12") {
  throw new Error("导航栏背景需为 #0b0d12");
}
if (pages.globalStyle.backgroundColor !== "#0b0d12") {
  throw new Error("页面背景需为 #0b0d12");
}

console.log("ok");
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_22_17_34_cinematic_theme.js`  
Expected: FAIL with "缺少主题变量" or "缺少背景渐变"

**Step 3: Write minimal implementation**

- 在 `frontend/uni.scss` 增加影院暗色主题变量、字体变量、渐变背景、基础动效与按钮基类。
- 更新 `frontend/pages.json` 全局导航栏颜色为暗色方案。

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_22_17_34_cinematic_theme.js`  
Expected: PASS with "ok"

**Step 5: Commit**

```bash
git add frontend/uni.scss frontend/pages.json AI_TOOL/test_2026_01_22_17_34_cinematic_theme.js AI_TOOL/test_2026_01_22_17_34_cinematic_theme.md
git commit -m "feat: 更新全局影院质感主题"
```

### Task 2: 最新/离线列表页影院化样式

**Files:**
- Modify: `frontend/pages/latest/index.vue`
- Modify: `frontend/pages/offline/index.vue`
- Create: `AI_TOOL/test_2026_01_22_17_34_cinematic_lists.js`
- Create: `AI_TOOL/test_2026_01_22_17_34_cinematic_lists.md`

**Step 1: Write the failing test**

```js
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const files = [
  path.join(root, "frontend", "pages", "latest", "index.vue"),
  path.join(root, "frontend", "pages", "offline", "index.vue")
];

for (const file of files) {
  const text = fs.readFileSync(file, "utf-8");
  if (!text.includes("item-card")) throw new Error(`缺少 item-card: ${file}`);
  if (!text.includes("btn")) throw new Error(`缺少 btn 基类: ${file}`);
  if (!text.includes("--delay")) throw new Error(`缺少渐入延迟: ${file}`);
}

console.log("ok");
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_22_17_34_cinematic_lists.js`  
Expected: FAIL with "缺少 item-card"

**Step 3: Write minimal implementation**

- 为最新/离线列表项增加 `item-card`、`btn` 等类名，并补齐渐入延迟样式。
- 更新按钮、媒体切换、卡片与进度条的影院质感样式。

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_22_17_34_cinematic_lists.js`  
Expected: PASS with "ok"

**Step 5: Commit**

```bash
git add frontend/pages/latest/index.vue frontend/pages/offline/index.vue AI_TOOL/test_2026_01_22_17_34_cinematic_lists.js AI_TOOL/test_2026_01_22_17_34_cinematic_lists.md
git commit -m "feat: 美化最新与离线列表视觉"
```

### Task 3: 设置页影院化表单样式

**Files:**
- Modify: `frontend/pages/settings/index.vue`
- Create: `AI_TOOL/test_2026_01_22_17_34_cinematic_settings.js`
- Create: `AI_TOOL/test_2026_01_22_17_34_cinematic_settings.md`

**Step 1: Write the failing test**

```js
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "frontend", "pages", "settings", "index.vue");
const text = fs.readFileSync(file, "utf-8");

if (!text.includes("panel")) throw new Error("缺少 panel 样式");
if (!text.includes("btn")) throw new Error("缺少 btn 基类");

console.log("ok");
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_22_17_34_cinematic_settings.js`  
Expected: FAIL with "缺少 panel"

**Step 3: Write minimal implementation**

- 设置页卡片使用 `panel` 类，按钮使用 `btn` 基类。
- 输入框与提示区改为暗色高对比样式。

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_22_17_34_cinematic_settings.js`  
Expected: PASS with "ok"

**Step 5: Commit**

```bash
git add frontend/pages/settings/index.vue AI_TOOL/test_2026_01_22_17_34_cinematic_settings.js AI_TOOL/test_2026_01_22_17_34_cinematic_settings.md
git commit -m "feat: 美化设置页影院质感表单"
```

### Task 4: 播放/阅读页面影院化细节

**Files:**
- Modify: `frontend/pages/player/index.vue`
- Modify: `frontend/pages/reader/index.vue`
- Create: `AI_TOOL/test_2026_01_22_17_34_cinematic_viewers.js`
- Create: `AI_TOOL/test_2026_01_22_17_34_cinematic_viewers.md`

**Step 1: Write the failing test**

```js
const fs = require("fs");
const path = require("path");

const files = [
  path.join(__dirname, "..", "frontend", "pages", "player", "index.vue"),
  path.join(__dirname, "..", "frontend", "pages", "reader", "index.vue")
];

for (const file of files) {
  const text = fs.readFileSync(file, "utf-8");
  if (!text.includes("btn")) throw new Error(`缺少 btn 基类: ${file}`);
  if (!text.includes("hero")) throw new Error(`缺少 hero 样式: ${file}`);
}

console.log("ok");
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_22_17_34_cinematic_viewers.js`  
Expected: FAIL with "缺少 btn"

**Step 3: Write minimal implementation**

- 播放/阅读页面头部使用 `hero` 类并调整标题/内容排版。
- 按钮使用 `btn` 基类，播放器与阅读容器增强层次与阴影。

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_22_17_34_cinematic_viewers.js`  
Expected: PASS with "ok"

**Step 5: Commit**

```bash
git add frontend/pages/player/index.vue frontend/pages/reader/index.vue AI_TOOL/test_2026_01_22_17_34_cinematic_viewers.js AI_TOOL/test_2026_01_22_17_34_cinematic_viewers.md
git commit -m "feat: 美化播放与阅读页"
```
