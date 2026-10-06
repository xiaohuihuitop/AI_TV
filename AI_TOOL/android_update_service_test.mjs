import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const source = await readFile(new URL("android/utils/updateService.js", root), "utf8").catch(() => "");
assert.match(source, /export function compareVersions/);
assert.match(source, /uni\.downloadFile/);
assert.match(source, /uni\.getFileInfo/);
assert.match(source, /runtime\.install/);
assert.match(source, /force: false/);
assert.match(source, /runtime\.restart/);

const configSource = await readFile(new URL("android/utils/appConfig.js", root), "utf8");
assert.match(configSource, /https:\/\/tv\.xhhtop\.top\/update\/update\.json/);
const appSource = await readFile(new URL("android/App.vue", root), "utf8");
assert.match(appSource, /runAutomaticUpdateCheck/);
assert.match(appSource, /onLaunch\(\)/);
assert.match(appSource, /onShow\(\)/);
assert.match(source, /route === "pages\/player\/index"/);
assert.match(source, /onProgress/);
assert.match(source, /autoInstall/);
assert.match(source, /update-available/);
const settingsSource = await readFile(new URL("android/pages/settings/index.vue", root), "utf8");
assert.match(settingsSource, /defaultIndexUrl/);

const update = await import("../android/utils/updateService.js");
const { compareVersions, validateUpdateManifest, isUpdateAvailable, createUpdateService } = update;
const config = await import("../android/utils/appConfig.js");
assert.equal(config.updateManifestUrl, "https://tv.xhhtop.top/update/update.json");
assert.match(config.defaultIndexUrl, /^https:\/\/tv\.xhhtop\.top\/public\/index\.json\?/);

assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
assert.equal(compareVersions("1.0.0", "1.0.1"), -1);
assert.equal(compareVersions("1.2.0", "1.1.99"), 1);
assert.equal(compareVersions("1.0", "1.0.0"), 0);
assert.throws(() => compareVersions("1.x.0", "1.0.0"), /版本/);

const valid = validateUpdateManifest({
  version: "1.0.1",
  version_code: 101,
  wgt_url: "https://tv.xhhtop.top/update/ai-tv-1.0.1.wgt",
  size_bytes: 123
});
assert.equal(valid.version, "1.0.1");
const savedUrlConstructor = globalThis.URL;
globalThis.URL = undefined;
try {
  assert.equal(validateUpdateManifest({
    version: "1.0.4",
    wgt_url: "https://tv.xhhtop.top/update/ai-tv-1.0.4.wgt?cache=1",
    size_bytes: 316131
  }).wgt_url, "https://tv.xhhtop.top/update/ai-tv-1.0.4.wgt?cache=1");
} finally {
  globalThis.URL = savedUrlConstructor;
}
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

let playbackActive = false;
let blockedDownloadCount = 0;
let lastBlockedCheckAt = 0;
const blockedAfterDownloadEvents = [];
const blockedAfterDownload = createUpdateService({
  getCurrentVersion: async () => "1.0.0",
  requestManifest: async () => valid,
  download: async () => {
    blockedDownloadCount += 1;
    if (blockedDownloadCount === 1) {
      playbackActive = true;
    }
    return { tempFilePath: "/tmp/playing.wgt" };
  },
  getFileSize: async () => 123,
  removeFile: async (path) => blockedAfterDownloadEvents.push(["remove", path]),
  install: async (path) => blockedAfterDownloadEvents.push(["install", path]),
  restart: () => blockedAfterDownloadEvents.push(["restart"]),
  isPlaybackActive: () => playbackActive,
  now: () => 1500,
  getLastCheckAt: () => lastBlockedCheckAt,
  setLastCheckAt: (value) => {
    lastBlockedCheckAt = value;
  }
});
assert.equal((await blockedAfterDownload.check()).status, "blocked-playing");
assert.deepEqual(blockedAfterDownloadEvents, [["remove", "/tmp/playing.wgt"]]);
assert.equal(lastBlockedCheckAt, 0);
playbackActive = false;
assert.equal((await blockedAfterDownload.check()).status, "installed");

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
assert.deepEqual(events.at(-1), ["remove-size", "/tmp/bad.wgt"]);

let requestCount = 0;
let release;
const deduplicated = createUpdateService({
  getCurrentVersion: async () => "1.0.0",
  requestManifest: async () => {
    requestCount += 1;
    await new Promise((resolve) => {
      release = resolve;
    });
    return valid;
  },
  download: async () => ({ tempFilePath: "/tmp/deduplicated.wgt" }),
  getFileSize: async () => 123,
  install: async () => {},
  removeFile: async () => {},
  restart: () => {},
  isPlaybackActive: () => false,
  now: () => 3000,
  getLastCheckAt: () => 0,
  setLastCheckAt: () => {}
});
const one = deduplicated.check();
const two = deduplicated.check();
assert.equal(one, two);
await Promise.resolve();
await Promise.resolve();
assert.equal(requestCount, 1);
release();
assert.equal((await one).status, "installed");

let manualProgress = [];
const manualEvents = [];
const manualService = createUpdateService({
  getCurrentVersion: async () => "1.0.0",
  requestManifest: async () => valid,
  download: async (url, onProgress) => {
    onProgress(0);
    onProgress(25);
    onProgress(100);
    return { tempFilePath: "/tmp/manual.wgt" };
  },
  getFileSize: async () => 123,
  removeFile: async (path) => manualEvents.push(["remove", path]),
  install: async (path) => manualEvents.push(["install", path]),
  restart: () => manualEvents.push(["restart"]),
  isPlaybackActive: () => false,
  now: () => 5000,
  getLastCheckAt: () => 4999,
  setLastCheckAt: () => {}
});
const manualAvailable = await manualService.check({
  force: true,
  autoInstall: false,
  onProgress: (value) => manualProgress.push(value)
});
assert.equal(manualAvailable.status, "update-available");
assert.equal(manualAvailable.version, valid.version);
assert.deepEqual(manualProgress, []);
const manualInstalled = await manualService.install(manualAvailable.manifest, {
  onProgress: (value) => manualProgress.push(value)
});
assert.equal(manualInstalled.status, "installed");
assert.deepEqual(manualProgress, [0, 25, 100]);
assert.deepEqual(manualEvents, [
  ["install", "/tmp/manual.wgt"],
  ["remove", "/tmp/manual.wgt"],
  ["restart"]
]);

const cooldownService = createUpdateService({
  getCurrentVersion: async () => "1.0.1",
  requestManifest: async () => valid,
  now: () => 6000,
  getLastCheckAt: () => 5999,
  setLastCheckAt: () => {}
});
assert.equal((await cooldownService.check()).status, "cooldown");
assert.equal((await cooldownService.check({ force: true, autoInstall: false })).status, "up-to-date");

console.log("android update service tests passed");
