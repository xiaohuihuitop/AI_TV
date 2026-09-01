# APK + WGT 自动更新 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让客户端通过 `tv.xiaohuihuitop.top` 自动检查、下载并安装最新 WGT，同时为服务端反代和升级文件发布提供可复制的部署说明。

**Architecture:** 客户端新增一个无 UI 的纯 JavaScript 更新服务，负责版本比较、清单校验、下载、临时文件清理和 App-Plus 安装；`App.vue` 只负责在启动/回前台时触发它，并跳过播放页。服务端不改 FastAPI API，`/web`、`/api`、`/public` 继续反代到 `8000`，`/update/` 由 Caddy/Nginx 直接提供持久化静态文件。

**Tech Stack:** uni-app Vue 3、App-Plus `plus.runtime`、`uni.request`、`uni.downloadFile`、Node.js ESM 回归脚本、Markdown 部署文档。

---

### Task 1: Define the update-service contract with failing tests

**Files:**
- Create: `AI_TOOL/android_update_service_test.mjs`
- Test: `android/utils/updateService.js`

- [x] **Step 1: Write the failing pure-function tests**

Add tests for the public contract below. The test imports `compareVersions`, `validateUpdateManifest`, `isUpdateAvailable`, and `createUpdateService` from `android/utils/updateService.js`.

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("android/utils/updateService.js", root), "utf8").catch(() => "");
assert.match(source, /export function compareVersions/);

const update = await import("../android/utils/updateService.js");
const { compareVersions, validateUpdateManifest, isUpdateAvailable, createUpdateService } = update;

assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
assert.equal(compareVersions("1.0.0", "1.0.1"), -1);
assert.equal(compareVersions("1.2.0", "1.1.99"), 1);
assert.equal(compareVersions("1.0", "1.0.0"), 0);
assert.throws(() => compareVersions("1.x.0", "1.0.0"), /版本/);

const valid = validateUpdateManifest({
  version: "1.0.1",
  version_code: 101,
  wgt_url: "https://tv.xiaohuihuitop.top/update/ai-tv-1.0.1.wgt",
  size_bytes: 123
});
assert.equal(valid.version, "1.0.1");
assert.equal(isUpdateAvailable("1.0.0", valid), true);
assert.equal(isUpdateAvailable("1.0.1", valid), false);
assert.equal(isUpdateAvailable("1.1.0", valid), false);
assert.throws(
  () => validateUpdateManifest({ version: "1.0.1", wgt_url: "http://example.test/app.wgt" }),
  /HTTPS/
);
assert.throws(
  () => validateUpdateManifest({ version: "1.0.1", wgt_url: "https://example.test/app.zip" }),
  /WGT/
);
assert.throws(
  () => validateUpdateManifest({ version: "1.0.1", wgt_url: "https://example.test/app.wgt", size_bytes: 0 }),
  /size_bytes/
);

const events = [];
const service = createUpdateService({
  getCurrentVersion: async () => "1.0.0",
  requestManifest: async () => valid,
  download: async (url, onProgress) => {
    events.push(["download", url]);
    onProgress(100);
    return { tempFilePath: "/tmp/ai-tv-1.0.1.wgt" };
  },
  getFileSize: async () => 123,
  removeFile: async (path) => events.push(["remove", path]),
  install: async (path) => events.push(["install", path]),
  restart: () => events.push(["restart"]),
  isPlaybackActive: () => false,
  now: () => 1000,
  getLastCheckAt: () => 0,
  setLastCheckAt: () => {}
});
const result = await service.check();
assert.equal(result.status, "installed");
assert.deepEqual(events, [
  ["download", valid.wgt_url],
  ["install", "/tmp/ai-tv-1.0.1.wgt"],
  ["remove", "/tmp/ai-tv-1.0.1.wgt"],
  ["restart"]
]);

const blocked = createUpdateService({
  getCurrentVersion: async () => "1.0.0",
  requestManifest: async () => valid,
  isPlaybackActive: () => true,
  now: () => 1000,
  getLastCheckAt: () => 0,
  setLastCheckAt: () => {}
});
assert.equal((await blocked.check()).status, "blocked-playing");

console.log("android update service tests passed");
```

- [x] **Step 2: Run the test and verify it fails for the intended reason**

Run: `node AI_TOOL/android_update_service_test.mjs`

Expected: FAIL because `android/utils/updateService.js` and its exported functions do not exist yet.

- [x] **Step 3: Keep the test within the current worktree**

Do not commit automatically in the current task unless the user explicitly requests a Git commit.

### Task 2: Implement pure version and manifest validation

**Files:**
- Create: `android/utils/updateService.js`
- Test: `AI_TOOL/android_update_service_test.mjs`

- [x] **Step 1: Implement strict semver-like comparison**

Export `compareVersions(left, right)` that accepts only `major.minor.patch` with numeric non-negative components, treats missing minor/patch as zero, returns `-1`, `0`, or `1`, and throws an `Error` containing `版本` for malformed input. Do not silently coerce arbitrary strings.

- [x] **Step 2: Implement `validateUpdateManifest`**

Return a normalized object containing `version`, optional numeric `version_code`, `wgt_url`, and optional positive integer `size_bytes`. Reject missing fields, non-HTTPS URLs, URLs whose pathname does not end in `.wgt`, malformed versions, non-positive sizes, and non-object JSON values. Keep the URL unchanged after validation so query parameters remain available to the downloader.

- [x] **Step 3: Implement `isUpdateAvailable`**

Return `true` only when the manifest version compares greater than the installed version. Treat validation errors as caller errors; do not add a downgrade fallback.

- [x] **Step 4: Run the tests**

Run: `node AI_TOOL/android_update_service_test.mjs`

Expected: The comparison, manifest, and update-availability assertions pass; the orchestration assertions may remain pending until Task 3.

### Task 3: Implement guarded download, install, cleanup, and cooldown

**Files:**
- Modify: `android/utils/updateService.js`
- Test: `AI_TOOL/android_update_service_test.mjs`

- [x] **Step 1: Implement `createUpdateService(deps, options)`**

The service must:

- Return `{ status: "skipped" }` when `getCurrentVersion` or `requestManifest` is unavailable, allowing non-App-Plus environments to bypass updates.
- Return `{ status: "cooldown" }` when `now() - getLastCheckAt() < checkIntervalMs`; default `checkIntervalMs` is six hours.
- Record the check timestamp before network work so repeated `onShow` calls cannot create parallel checks.
- Return `{ status: "blocked-playing" }` before downloading when `isPlaybackActive()` is true.
- Deduplicate concurrent calls by returning the same in-flight Promise.
- Validate the manifest, compare versions, and return `{ status: "up-to-date", version }` when no update exists.
- Call `download(wgt_url, onProgress)` and require a non-empty local file path.
- When `size_bytes` is declared, call `getFileSize(path)` and reject a mismatch.
- Call `install(path)` with `force: false` semantics exposed by the runtime adapter, then call `restart()` only after install resolves successfully.
- Remove the temporary file after download-size failure, install failure, or successful install when `removeFile` is available.
- Return structured statuses for `download-failed`, `invalid-manifest`, `size-mismatch`, and `install-failed`, while never throwing through the App lifecycle.

The service must not show a modal, retry button, or user-facing error. It may send sanitized diagnostics to `console.warn`; do not log URLs containing credentials.

- [x] **Step 2: Add failure and duplicate-call tests**

Extend `AI_TOOL/android_update_service_test.mjs` with these assertions:

```js
const sizeFailure = createUpdateService({
  getCurrentVersion: async () => "1.0.0",
  requestManifest: async () => valid,
  download: async () => ({ tempFilePath: "/tmp/bad.wgt" }),
  getFileSize: async () => 99,
  removeFile: async (path) => events.push(["remove-size", path]),
  isPlaybackActive: () => false,
  now: () => 2000,
  getLastCheckAt: () => 0,
  setLastCheckAt: () => {}
});
assert.equal((await sizeFailure.check()).status, "size-mismatch");

let requestCount = 0;
let release;
const first = createUpdateService({
  getCurrentVersion: async () => "1.0.0",
  requestManifest: async () => {
    requestCount += 1;
    await new Promise((resolve) => { release = resolve; });
    return valid;
  },
  isPlaybackActive: () => false,
  now: () => 3000,
  getLastCheckAt: () => 0,
  setLastCheckAt: () => {}
});
const one = first.check();
const two = first.check();
assert.equal(one, two);
await Promise.resolve();
await Promise.resolve();
release();
await one;
assert.equal(requestCount, 1);
```

- [x] **Step 3: Run the complete update-service test**

Run: `node AI_TOOL/android_update_service_test.mjs`

Expected: PASS with `android update service tests passed`.

### Task 4: Adapt uni-app and App-Plus runtime APIs

**Files:**
- Modify: `android/utils/updateService.js`
- Modify: `android/utils/appConfig.js`
- Test: `AI_TOOL/android_update_service_test.mjs`

- [x] **Step 1: Add the fixed update manifest URL and default public URL**

Add `updateManifestUrl` with the exact value `https://tv.xiaohuihuitop.top/update/update.json`. Change only the hostname and protocol of the existing `defaultIndexUrl`; preserve its existing `user` and `pass` query values without copying those values into new documentation. Keep `normalizeRequestUrl` behavior so a user-entered URL without a protocol remains compatible, while the built-in default now uses the new HTTPS domain without an exposed port.

- [x] **Step 2: Add runtime adapters**

Use `plus.runtime.getProperty(plus.runtime.appid, callback)` for the current resource version. Use `uni.request` to load JSON, `uni.downloadFile` for the WGT, `uni.getFileInfo` for optional size checking, `plus.runtime.install(localPath, { force: false }, success, fail)` for installation, and `plus.runtime.restart()` after success. Resolve local temporary-file cleanup through `plus.io.resolveLocalFileSystemURL` when available; cleanup failure must not turn a successful install into a failed update.

- [x] **Step 3: Add runtime adapter tests**

Assert the source contains the fixed HTTPS update URL, `plus.runtime.getProperty`, `uni.downloadFile`, `uni.getFileInfo`, `plus.runtime.install`, `force: false`, and `plus.runtime.restart`. The Node test must not invoke these globals; it only verifies source contracts and pure behavior.

- [x] **Step 4: Run the update tests**

Run: `node AI_TOOL/android_update_service_test.mjs`

Expected: PASS.

### Task 5: Wire updates into the application lifecycle

**Files:**
- Modify: `android/App.vue`
- Modify: `android/pages/player/index.vue`
- Test: `AI_TOOL/android_update_service_test.mjs`

- [x] **Step 1: Add a single app-level update service instance**

Create the service once in `App.vue`, trigger it after a short launch delay, and call it again from `onShow`; the service cooldown and in-flight guard prevent duplicate network requests. Do not put update UI into any page.

- [x] **Step 2: Protect playback**

The runtime adapter checks `getCurrentPages()` and treats `pages/player/index` as active playback. Add a defensive lifecycle marker in `player/index.vue` only if the adapter cannot reliably read the current route; do not change player layout, fullscreen, controls, or playback source behavior.

- [x] **Step 3: Add lifecycle source assertions**

Assert `App.vue` references the update service and both `onLaunch` and `onShow`, and assert the player route is used as the playback guard. Keep existing fullscreen regression assertions unchanged.

- [x] **Step 4: Run all Android Node tests**

Run from PowerShell:

```powershell
Get-ChildItem AI_TOOL\*_test.mjs | ForEach-Object {
  node $_.FullName
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

Expected: every existing Android regression script and `android_update_service_test.mjs` exits with code 0.

### Task 6: Document reverse proxy and WGT publishing

**Files:**
- Modify: `server/README.md`
- Modify: `android/Doc/APP打包说明.md`
- Modify: `docs/project/需求.md`
- Modify: `docs/project/计划.md`
- Modify: `docs/project/进度.md`
- Modify: `docs/project/总结.md`
- Modify: `ai_knowledge.md`
- Modify: `docs/project/项目总览.md`

- [x] **Step 1: Document the domain routes and port binding**

Add a Caddy example and an Nginx/DSM mapping that send `/`, `/web/`, `/api/`, and `/public/` to the container’s `8000`, while serving `/update/` from a persistent host directory. Include `client_max_body_size 2G` for Nginx uploads, HTTPS certificate requirements, forwarded headers, and the recommendation to bind Docker as `127.0.0.1:8000:8000` when the proxy is on the same host.

- [x] **Step 2: Document the release sequence**

Explain that the WGT must be built with a higher app resource version, uploaded first, and then referenced by `update.json`. Include a redacted example using placeholders for credentials, plus verification commands for HTTPS, JSON response, WGT download, and the generated public resource URLs. Explain that APK changes still require a new APK.

- [x] **Step 3: Record the accepted decision and risks**

Append the domain/unified HTTPS/WGT decision to project requirement, plan, progress, summary, and knowledge records. Register the new knowledge entry in `docs/project/项目总览.md`. Preserve the existing note that current public-resource query authentication is unchanged; do not print actual passwords in new documentation.

- [x] **Step 4: Run documentation checks**

Run: `git diff --check`

Expected: no whitespace errors; all example URLs use `https://tv.xiaohuihuitop.top` and no new document exposes a real password.

### Task 7: Validate the deployed-domain contract and package behavior

**Files:**
- Modify: none
- Test: deployed server and App-Plus simulator/device

- [ ] **Step 1: Verify the reverse proxy**

Check:

```powershell
curl.exe -I https://tv.xiaohuihuitop.top/
curl.exe -I https://tv.xiaohuihuitop.top/update/update.json
curl.exe -u "<user>:<password>" "https://tv.xiaohuihuitop.top/public/index.json"
```

Expected: HTTPS succeeds, update JSON is `200`, and JSON video/document URLs begin with `https://tv.xiaohuihuitop.top`.

- [ ] **Step 2: Verify old-version WGT installation**

Build a WGT with a version greater than the installed APK/resource version, upload the `.wgt`, publish matching `update.json`, install the old APK on the simulator/device, and start it. Confirm the app remains usable while the check runs, restarts only after installation, and shows the new resource behavior after restart.

- [ ] **Step 3: Verify failure safety**

Temporarily make the manifest unavailable, use a malformed manifest, stop the WGT download, and open the player while an update is available. Expected: the current app still opens, playback is not interrupted, no downgrade occurs, and the next eligible launch can check again.

- [ ] **Step 4: Final verification before delivery**

Run:

```powershell
git diff --check
Get-ChildItem AI_TOOL\*_test.mjs | ForEach-Object {
  node $_.FullName
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

Expected: all commands complete successfully. Do not claim a real WGT or Docker deployment passed unless the simulator/server output is available in this workspace.

当前执行结果：本地 WGT 已生成并校验，完整回归命令已通过；线上 `/update/update.json` 仍为 `404`，因此 Task 7 的线上反代、自动安装和失败安全验收尚未完成。
