# Android Responsive Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Android 客户端在常见手机、窄屏、横屏和宽屏设备上保持可读、可操作且无横向裁切。

**Architecture:** 全局运行样式由 `App.vue` 统一提供，页面组件只负责自身布局。播放器高度提取为无平台依赖的纯函数，以便自动化测试；视觉结果通过 HBuilderX 基座和 ADB 截图验证。

**Tech Stack:** uni-app、Vue 3、CSS Grid/Flex、Node.js ESM、HBuilderX CLI、ADB

---

### Task 1: 建立响应式回归测试

**Files:**
- Create: `AI_TOOL/android_responsive_layout_test.mjs`
- Create: `android/utils/layout.js`

- [x] 编写测试，断言 360x640 竖屏播放器高度为 220、640x360 横屏不超过 240，并断言全局样式位于 `App.vue`、视频信息可收缩换行。
- [x] 运行 `node AI_TOOL/android_responsive_layout_test.mjs`，确认因 `layout.js` 尚不存在而失败。
- [x] 实现 `calculateVideoHeight(width, height)`，再运行测试确认通过。

### Task 2: 修复全局样式和页面布局

**Files:**
- Modify: `android/App.vue`
- Modify: `android/uni.scss`
- Modify: `android/pages/latest/index.vue`
- Modify: `android/pages/offline/index.vue`
- Modify: `android/pages/settings/index.vue`
- Modify: `android/components/AppTabBar.vue`

- [x] 将页面、卡片、按钮和颜色变量迁入 `App.vue`，统一 `box-sizing`、页面最大宽度和安全区。
- [x] 最新页和离线页改用可收缩 Grid，标签允许换行，并增加小屏/宽屏断点。
- [x] 设置页操作按钮改为等宽 Grid，底部导航增加最大宽度和安全区适配。
- [x] 运行响应式回归测试。

### Task 3: 修复播放和阅读视口

**Files:**
- Modify: `android/pages/player/index.vue`
- Modify: `android/pages/reader/index.vue`

- [x] 播放页调用 `calculateVideoHeight` 并在尺寸变化时重新计算。
- [x] 阅读页使用剩余视口高度，正文和错误文字维持适老字号。
- [x] 运行响应式回归测试和 HBuilderX 编译检查。

### Task 4: 文档、构建和模拟器验收

**Files:**
- Modify: `docs/project/需求.md`
- Modify: `docs/project/计划.md`
- Modify: `docs/project/进度.md`
- Modify: `ai_knowledge.md`
- Modify: `docs/project/项目总览.md`

- [x] 记录响应式需求、计划、结果和根因。
- [x] 使用 HBuilderX CLI 运行到 `emulator-5554`。
- [x] 通过 ADB 操作主要页面并抓取 360dp、320dp 和横屏截图。
- [x] 恢复模拟器原始分辨率并运行最终测试。
