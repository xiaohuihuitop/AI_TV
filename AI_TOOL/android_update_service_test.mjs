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
assert.match(configSource, /https:\/\/tv\.xiaohuihuitop\.top\/update\/update\.json/);
const appSource = await readFile(new URL("android/App.vue", root), "utf8");
assert.match(appSource, /createAppUpdateService/);
assert.match(appSource, /onLaunch\(\)/);
assert.match(appSource, /onShow\(\)/);
assert.match(source, /route === "pages\/player\/index"/);
const settingsSource = await readFile(new URL("android/pages/settings/index.vue", root), "utf8");
assert.match(settingsSource, /https:\/\/tv\.xiaohuihuitop\.top\/public\/index\.json/);

const update = await import("../android/utils/updateService.js");
const { compareVersions, validateUpdateManifest, isUpdateAvailable, createUpdateService } = update;
const config = await import("../android/utils/appConfig.js");
assert.equal(config.updateManifestUrl, "https://tv.xiaohuihuitop.top/update/update.json");
assert.match(config.defaultIndexUrl, /^https:\/\/tv\.xiaohuihuitop\.top\/public\/index\.json\?/);

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

console.log("android update service tests passed");
