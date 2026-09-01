# Fullscreen Video Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace native video fullscreen with an immersive player page that permanently shows Previous, Back, and Next below an uncropped video.

**Architecture:** Keep queue and playback behavior in `pages/player/index.vue`, move deterministic immersive layout/orientation calculations into `utils/layout.js`, and isolate HTML5+ status-bar/orientation calls in a small `utils/immersivePlayer.js` adapter. The player enters immersive mode only after playback and orientation are known, while cleanup is idempotent on both Back and unload.

**Tech Stack:** uni-app Vue 2, App-Plus HTML5+ APIs, Node.js assertion scripts, HBuilderX Android runtime, MuMu emulator.

---

### Task 1: Define immersive layout and orientation behavior

**Files:**
- Modify: `android/utils/layout.js`
- Modify: `AI_TOOL/android_player_fullscreen_test.mjs`

- [ ] **Step 1: Write failing assertions for orientation names and full-height video area**

Add imports and assertions that require `getVideoOrientationLock(width, height)` to return `landscape-primary` or `portrait-primary`, and `calculateImmersiveVideoHeight(windowHeight, actionHeight, safeBottom)` to reserve the complete action/safe-area height.

```js
assert.equal(getVideoOrientationLock(1920, 1080), "landscape-primary");
assert.equal(getVideoOrientationLock(1080, 1920), "portrait-primary");
assert.equal(calculateImmersiveVideoHeight(360, 72, 0), 288);
assert.equal(calculateImmersiveVideoHeight(640, 72, 24), 544);
```

- [ ] **Step 2: Run the test and verify the new exports are missing**

Run: `node AI_TOOL/android_player_fullscreen_test.mjs`

Expected: FAIL because `getVideoOrientationLock` and `calculateImmersiveVideoHeight` are not exported.

- [ ] **Step 3: Implement the deterministic helpers**

Add the two exports to `android/utils/layout.js`. Invalid dimensions default to portrait; invalid height inputs are normalized and the video height never becomes negative.

```js
export function getVideoOrientationLock(width, height) {
  return Number(width) > Number(height)
    ? "landscape-primary"
    : "portrait-primary";
}

export function calculateImmersiveVideoHeight(windowHeight, actionHeight, safeBottom) {
  const height = Math.max(0, Number(windowHeight) || 0);
  const reserved = Math.max(0, Number(actionHeight) || 0)
    + Math.max(0, Number(safeBottom) || 0);
  return Math.max(0, Math.round(height - reserved));
}
```

- [ ] **Step 4: Run the helper regression test**

Run: `node AI_TOOL/android_player_fullscreen_test.mjs`

Expected: PASS for the new helper assertions; source assertions may still fail until Task 3 and will be updated there.

### Task 2: Add an idempotent HTML5+ immersive adapter

**Files:**
- Create: `android/utils/immersivePlayer.js`
- Create: `AI_TOOL/android_immersive_player_test.mjs`

- [ ] **Step 1: Write failing adapter tests with a fake `plus` runtime**

Test that `enterImmersivePlayer(plusRuntime, orientation)` locks orientation before hiding system chrome, that changing orientation only relocks orientation, and that `exitImmersivePlayer` locks back to portrait before restoring system chrome.

```js
const calls = [];
const plusRuntime = {
  navigator: { setFullscreen: (value) => calls.push(["fullscreen", value]) },
  screen: {
    lockOrientation: (value) => calls.push(["lock", value]),
    unlockOrientation: () => calls.push(["unlock"])
  }
};
const controller = createImmersivePlayerController(() => plusRuntime);
controller.enter("landscape-primary");
controller.enter("landscape-primary");
controller.enter("portrait-primary");
controller.exit();
controller.exit();
assert.deepEqual(calls, [
  ["lock", "landscape-primary"],
  ["fullscreen", true],
  ["lock", "portrait-primary"],
  ["lock", "portrait-primary"],
  ["fullscreen", false]
]);
```

- [ ] **Step 2: Run the adapter test and verify it fails**

Run: `node AI_TOOL/android_immersive_player_test.mjs`

Expected: FAIL because `android/utils/immersivePlayer.js` does not exist.

- [ ] **Step 3: Implement the adapter**

Create `createImmersivePlayerController(getRuntime)` with `enter(orientation)` and `exit()` methods. Missing APIs and native exceptions return `false` without affecting video playback; internal state changes only after available calls are attempted, and repeated calls are idempotent.

- [ ] **Step 4: Run the adapter test**

Run: `node AI_TOOL/android_immersive_player_test.mjs`

Expected: `android immersive player tests passed`.

### Task 3: Convert the player page to immersive layout

**Files:**
- Modify: `android/pages/player/index.vue`
- Modify: `android/pages.json`
- Modify: `AI_TOOL/android_player_fullscreen_test.mjs`
- Modify: `AI_TOOL/android_responsive_layout_test.mjs`

- [ ] **Step 1: Replace old source assertions with failing immersive-page assertions**

Require the player to use `object-fit="contain"`, disable the native fullscreen button, render the action bar inside the fullscreen shell, import the immersive controller, enter it from the existing play/direction gate, and restore it in `onUnload`. Require `pages.json` player navigation style to be `custom`.

```js
assert.match(player, /:show-fullscreen-btn="false"/);
assert.match(player, /class="immersive-actions"/);
assert.doesNotMatch(player, /requestFullScreen/);
assert.match(player, /immersiveController\.enter\(this\.pendingOrientationLock\)/);
assert.match(player, /onUnload\(\)\s*\{[\s\S]*?this\.exitImmersiveMode\(\)/);
assert.equal(playerPage.style.navigationStyle, "custom");
```

- [ ] **Step 2: Run player and responsive tests and verify failure**

Run:

```powershell
node AI_TOOL/android_player_fullscreen_test.mjs
node AI_TOOL/android_responsive_layout_test.mjs
```

Expected: FAIL on the new immersive assertions and old `calculateVideoHeight` assertion.

- [ ] **Step 3: Update player state and lifecycle**

Replace `pendingFullscreenDirection`, native fullscreen state, and `tryEnterFullscreen()` with `pendingOrientationLock`, `isImmersive`, and `tryEnterImmersiveMode()`. Instantiate the controller once, enter after both play and direction are ready, recalculate the video area after entry/resize, and call one idempotent `exitImmersiveMode()` from both `goBack()` and `onUnload()`.

- [ ] **Step 4: Update template and styles**

Move all three existing buttons into `.immersive-actions` directly beneath the video. Make `.player-page` a fixed-height column while immersive, let `.video-shell` use the calculated remaining height, retain `object-fit="contain"`, disable `show-fullscreen-btn`, remove obsolete fullscreen event handling, and include bottom safe-area padding in the action bar.

- [ ] **Step 5: Configure custom navigation for the player page**

Set only `pages/player/index` to:

```json
{
  "navigationBarTitleText": "播放",
  "navigationStyle": "custom"
}
```

- [ ] **Step 6: Run focused Android regression scripts**

Run:

```powershell
node AI_TOOL/android_immersive_player_test.mjs
node AI_TOOL/android_player_fullscreen_test.mjs
node AI_TOOL/android_responsive_layout_test.mjs
node AI_TOOL/latest_local_playback_test.mjs
```

Expected: all four scripts print their success messages and exit 0.

### Task 4: Validate the complete Android behavior

**Files:**
- Modify: `docs/project/进度.md`
- Modify: `docs/project/总结.md`
- Modify: `ai_knowledge.md`
- Modify: `docs/project/项目总览.md`

- [ ] **Step 1: Run every repository Node regression script**

Run:

```powershell
Get-ChildItem AI_TOOL\*_test.mjs | ForEach-Object { node $_.FullName; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
```

Expected: every script exits 0.

- [ ] **Step 2: Build and install the App-Plus debug package**

Use the repository's existing HBuilderX CLI/build process and ADB target discovered from the current environment. Install the new package without clearing app data so the configured server and downloaded-video state remain available.

- [ ] **Step 3: Verify the horizontal video in MuMu**

Open the existing horizontal test video and verify: landscape orientation, hidden status/navigation chrome, full uncropped picture, all three buttons below the picture, Previous/Next queue switching, and Back restoring normal orientation/status bar.

- [ ] **Step 4: Verify the vertical video and responsive states in MuMu**

Open the existing vertical test video and verify portrait immersive mode, all three buttons visible without overlap, disabled state at queue boundaries, local downloaded playback, and no text overflow at the available emulator sizes.

- [ ] **Step 5: Record verified results and reusable root cause**

Append the actual command and emulator evidence to `docs/project/进度.md` and `docs/project/总结.md`. Add an `ai_knowledge.md` entry explaining why native video fullscreen cannot reserve Vue UI space, then register that entry in `docs/project/项目总览.md`.

- [ ] **Step 6: Review the final diff**

Run:

```powershell
git diff --check
git status --short
git diff -- android AI_TOOL docs/project ai_knowledge.md
```

Expected: only task-related files plus the known user-owned `android/.hbuilderx/launch.json` and `tmp/` remain; no whitespace errors in task files.
