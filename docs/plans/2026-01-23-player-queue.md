# Player Queue Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在最新/离线页面写入播放队列，让播放器支持上一个/下一个与重播，并保证离线点击即播。

**Architecture:** 使用本地存储持久化播放队列与当前索引；最新/离线页在进入播放器前写入队列；播放器读取队列并在切换时回写索引，结束后显示重播。

**Tech Stack:** uni-app (Vue), 本地存储 (uni.getStorageSync), 手动同步 dist 编译产物。

### Task 1: 新增播放队列工具

**Files:**
- Create: `frontend/utils/playerQueue.js`
- Test: `AI_TOOL/test_2026_01_23_10_45_player_queue.mjs`
- Test Doc: `AI_TOOL/test_2026_01_23_10_45_player_queue.md`

**Step 1: Write the failing test**

```js
// AI_TOOL/test_2026_01_23_10_45_player_queue.mjs
import { loadPlayerQueue, savePlayerQueue, updatePlayerIndex } from "../frontend/utils/playerQueue.js";

const memory = (() => {
  const store = new Map();
  return {
    get: (key) => store.get(key),
    set: (key, value) => store.set(key, value),
    remove: (key) => store.delete(key)
  };
})();

savePlayerQueue(memory, [{ id: "1", url: "u" }], 0);
const result = loadPlayerQueue(memory);
if (!result || result.list.length !== 1 || result.index !== 0) {
  throw new Error("queue save/load failed");
}
updatePlayerIndex(memory, 1);
const next = loadPlayerQueue(memory);
if (next.index !== 1) {
  throw new Error("index update failed");
}
console.log("ok");
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_23_10_45_player_queue.mjs`
Expected: FAIL with module not found or function missing

**Step 3: Write minimal implementation**

```js
// frontend/utils/playerQueue.js
export function loadPlayerQueue(storage) {
  const listRaw = storage.get("player_queue");
  const indexRaw = storage.get("player_queue_index");
  const list = listRaw ? JSON.parse(listRaw) : [];
  const index = Number.isFinite(Number(indexRaw)) ? Number(indexRaw) : -1;
  return { list, index };
}

export function savePlayerQueue(storage, list, index) {
  storage.set("player_queue", JSON.stringify(list || []));
  storage.set("player_queue_index", String(index ?? -1));
}

export function updatePlayerIndex(storage, index) {
  storage.set("player_queue_index", String(index ?? -1));
}
```

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_23_10_45_player_queue.mjs`
Expected: PASS (prints "ok")

**Step 5: Commit**

```bash
git add AI_TOOL/test_2026_01_23_10_45_player_queue.mjs AI_TOOL/test_2026_01_23_10_45_player_queue.md frontend/utils/playerQueue.js
git commit -m "test: 添加播放器队列工具测试"
```

### Task 2: 最新/离线页写入播放队列

**Files:**
- Modify: `frontend/pages/latest/index.vue`
- Modify: `frontend/pages/offline/index.vue`

**Step 1: Write the failing test**

```js
// AI_TOOL/test_2026_01_23_10_45_player_queue.mjs
// 增加断言：最新/离线的 openVideo 会写入队列（改为手动检查）
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_23_10_45_player_queue.mjs`
Expected: FAIL (手动确认未写入队列)

**Step 3: Write minimal implementation**

- 最新页 `openVideo` 写入 `videoItems` 队列与索引。
- 离线页 `openVideo` 仅对 `status === "done"` 写入已完成列表。

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_23_10_45_player_queue.mjs`
Expected: PASS (手动确认写入队列)

**Step 5: Commit**

```bash
git add frontend/pages/latest/index.vue frontend/pages/offline/index.vue
git commit -m "feat(player): 写入播放队列"
```

### Task 3: 播放器支持上一个/下一个与重播

**Files:**
- Modify: `frontend/pages/player/index.vue`

**Step 1: Write the failing test**

```js
// AI_TOOL/test_2026_01_23_10_45_player_queue.mjs
// 增加手动检查项：上一个/下一个/重播按钮可见且行为正确
```

**Step 2: Run test to verify it fails**

Run: `node AI_TOOL/test_2026_01_23_10_45_player_queue.mjs`
Expected: FAIL (手动确认按钮缺失)

**Step 3: Write minimal implementation**

- 移除完整/铺满，替换为上一个/下一个。
- 播放结束显示重播按钮。
- 切换时回写队列索引。

**Step 4: Run test to verify it passes**

Run: `node AI_TOOL/test_2026_01_23_10_45_player_queue.mjs`
Expected: PASS (手动确认按钮与行为)

**Step 5: Commit**

```bash
git add frontend/pages/player/index.vue
git commit -m "feat(player): 增加上一/下一与重播"
```

### Task 4: 同步编译产物

**Files:**
- Modify: `frontend/unpackage/dist/dev/app-plus/app-service.js`
- Modify: `frontend/unpackage/dist/dev/app-plus/pages/player/index.css`
- Modify: `frontend/unpackage/dist/dev/app-plus/pages/latest/index.css`
- Modify: `frontend/unpackage/dist/dev/app-plus/pages/offline/index.css`

**Step 1: Write the failing test**

```text
人工检查：dist 中播放器按钮仍为完整/铺满，未包含队列逻辑
```

**Step 2: Update dist output**

- 同步 JS 逻辑与样式。

**Step 3: Commit**

```bash
git add frontend/unpackage/dist/dev/app-plus/app-service.js frontend/unpackage/dist/dev/app-plus/pages/player/index.css frontend/unpackage/dist/dev/app-plus/pages/latest/index.css frontend/unpackage/dist/dev/app-plus/pages/offline/index.css
git commit -m "chore(build): 同步播放器与列表编译产物"
```
