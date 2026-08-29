# Android Player Auto Fullscreen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 手机端视频打开后按实际画面方向自动全屏，同时完整显示视频且不裁切。

**Architecture:** 优先使用清单宽高，缺失时读取服务端生成封面的实际尺寸，通过纯函数映射为 uni-app 全屏方向，并在原生 `play` 事件后调用 `VideoContext.requestFullScreen`。播放器继续使用 `contain`，并保留原生全屏按钮；自动全屏失败只停止本次自动请求，不影响播放。

**Tech Stack:** uni-app、Vue 3、VideoContext、Node.js ESM、HBuilderX、Android 模拟器

---

### Task 1: 全屏方向回归测试

**Files:**
- Create: `AI_TOOL/android_player_fullscreen_test.mjs`
- Modify: `android/utils/layout.js`

- [x] 新增失败测试，要求横屏返回 `90`、竖屏和方形返回 `0`。
- [x] 运行 `node AI_TOOL/android_player_fullscreen_test.mjs`，确认因方向函数尚不存在而失败。
- [x] 在 `android/utils/layout.js` 增加最小方向判断函数。
- [x] 重跑测试，确认方向判断通过。

### Task 2: 播放器自动全屏

**Files:**
- Modify: `android/pages/player/index.vue`
- Test: `AI_TOOL/android_player_fullscreen_test.mjs`

- [x] 测试要求播放器保留 `object-fit="contain"`、显示原生全屏按钮并监听播放和全屏状态。
- [x] 读取条目宽高或封面尺寸，在播放开始后按实际方向调用 `requestFullScreen({ direction })`。
- [x] 切换视频时重置自动请求状态，避免同一视频反复抢占全屏。
- [x] 捕获同步和 Promise 异步失败，保证失败不阻断播放。

### Task 3: 编译和模拟器验收

**Files:**
- Modify: `docs/project/需求.md`
- Modify: `docs/project/计划.md`
- Modify: `docs/project/进度.md`
- Modify: `docs/project/总结.md`
- Modify: `ai_knowledge.md`
- Modify: `docs/project/项目总览.md`

- [x] 运行播放器全屏测试及现有 Android 回归脚本。
- [x] 使用 HBuilderX CLI 编译并运行到 Android 模拟器。
- [x] 分别验证竖屏视频竖向全屏、横屏视频横向全屏，并确认完整画面无裁切。
- [x] 更新项目文档和关键问题知识记录，检查最终 Git 差异。

> Git 提交和远程推送不在本次范围内，需用户另行确认。
