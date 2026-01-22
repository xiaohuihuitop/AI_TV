# 图文 Markdown 渲染 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在图文阅读页支持完整 Markdown 渲染（含图片/表格/代码），并保持浅色主题可读性。

**Architecture:** 引入 `mp-html` 组件解析 Markdown；阅读页改用 `<mp-html>` 渲染；新增 `contentDomain` 处理相对资源；保持原有加载/错误逻辑不变。

**Tech Stack:** uni-app + Vue 3 + mp-html

### Task 1: 添加阅读页 Markdown 结构测试

**Files:**
- Create: `AI_TOOL/test_2026_01_22_20_10_reader_markdown.js`
- Create: `AI_TOOL/test_2026_01_22_20_10_reader_markdown.md`
- Test: `AI_TOOL/test_2026_01_22_20_10_reader_markdown.js`

**Step 1: Write the failing test**

```js
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const readerPath = path.join(root, "frontend", "pages", "reader", "index.vue");

function fail(message) {
  console.error(message);
  process.exit(1);
}

const text = fs.readFileSync(readerPath, "utf-8");

if (!/mp-html/.test(text)) {
  fail("阅读页需引入 mp-html 组件");
}

if (!/<mp-html[\s\S]*:content=/.test(text)) {
  fail("阅读页需使用 mp-html 渲染 content");
}

if (!/markdown\s*=\s*"true"/.test(text)) {
  fail("阅读页需启用 markdown 渲染");
}

if (!/contentDomain/.test(text)) {
  fail("阅读页需设置 contentDomain");
}

console.log("ok");
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_22_20_10_reader_markdown.js`
Expected: FAIL（缺少 mp-html 或 markdown 配置）。

**Step 3: Write minimal implementation**

说明文档 `AI_TOOL/test_2026_01_22_20_10_reader_markdown.md`：
- 用途：校验阅读页 Markdown 渲染结构
- 使用方法：`node AI_TOOL/test_2026_01_22_20_10_reader_markdown.js`
- 预期结果：输出 `ok`

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_22_20_10_reader_markdown.js`
Expected: PASS，输出 `ok`。

**Step 5: Commit**

```bash
git add AI_TOOL/test_2026_01_22_20_10_reader_markdown.js AI_TOOL/test_2026_01_22_20_10_reader_markdown.md
git commit -m "test(reader): 添加 Markdown 渲染结构校验"
```

### Task 2: 引入 mp-html 组件资源

**Files:**
- Create: `frontend/uni_modules/mp-html/components/mp-html/*`（按组件规范放置）

**Step 1: Write the failing test**

已在 Task 1 覆盖。

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_22_20_10_reader_markdown.js`
Expected: FAIL（未引入 mp-html）。

**Step 3: Write minimal implementation**

将 mp-html 组件文件放入：
`frontend/uni_modules/mp-html/components/mp-html/`

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_22_20_10_reader_markdown.js`
Expected: 仍可能 FAIL（阅读页未使用组件）。

**Step 5: Commit**

```bash
git add frontend/uni_modules/mp-html
git commit -m "feat(reader): 引入 mp-html 组件"
```

### Task 3: 阅读页使用 mp-html 渲染

**Files:**
- Modify: `frontend/pages/reader/index.vue`
- Test: `AI_TOOL/test_2026_01_22_20_10_reader_markdown.js`

**Step 1: Write the failing test**

已在 Task 1 覆盖。

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_22_20_10_reader_markdown.js`
Expected: FAIL（缺少 markdown 渲染配置）。

**Step 3: Write minimal implementation**

- 引入并注册 `mp-html` 组件
- 模板替换为：

```vue
<mp-html
  v-if="content"
  class="content-html"
  :content="content"
  :markdown="true"
  :selectable="true"
  :preview-img="true"
  :content-domain="contentDomain"
></mp-html>
```

- 新增 `contentDomain` 计算逻辑（仅 http/https）：

```js
computeContentDomain() {
  if (!this.source || !/^https?:\/\//i.test(this.source)) {
    return "";
  }
  try {
    const url = new URL(this.source);
    const basePath = url.pathname.replace(/\/[^/]*$/, "/");
    return `${url.origin}${basePath}`;
  } catch (error) {
    return "";
  }
}
```

- `loadContent` 成功后设置 `this.contentDomain = this.computeContentDomain()`

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_22_20_10_reader_markdown.js`
Expected: PASS，输出 `ok`。

**Step 5: Commit**

```bash
git add frontend/pages/reader/index.vue
git commit -m "feat(reader): 支持 Markdown 渲染"
```

### Task 4: 调整 Markdown 样式以匹配浅色主题

**Files:**
- Modify: `frontend/pages/reader/index.vue`

**Step 1: Write minimal implementation**

新增样式（示例）：

```css
.content-html :deep(h1),
.content-html :deep(h2),
.content-html :deep(h3) {
  margin: 16px 0 8px;
  font-family: var(--font-display);
}
.content-html :deep(code) {
  background: rgba(31, 27, 22, 0.08);
  padding: 2px 6px;
  border-radius: 6px;
}
.content-html :deep(pre) {
  background: #f3ede6;
  padding: 12px;
  border-radius: 12px;
  overflow: auto;
}
```

**Step 2: Commit**

```bash
git add frontend/pages/reader/index.vue
git commit -m "style(reader): 优化 Markdown 样式"
```

### Task 5: 全量测试回归

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