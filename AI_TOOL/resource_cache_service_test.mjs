import assert from "node:assert/strict";
import {
  buildResourceIdentity,
  createResourceCacheService
} from "../android/utils/resourceCacheService.js";

function createStorage(initial = {}) {
  const values = { ...initial };
  return {
    get: (key) => values[key],
    set: (key, value) => {
      values[key] = value;
    },
    remove: (key) => delete values[key],
    values
  };
}

const sourceA = {
  id: 1,
  type: "photo",
  title: "A",
  url: "https://a.example/photo/1?user=admin&pass=admin&_t=1",
  size_bytes: 10
};
const sourceB = { ...sourceA, url: "https://b.example/photo/1?user=admin&pass=admin" };
assert.notEqual(buildResourceIdentity(sourceA), buildResourceIdentity(sourceB));
assert.equal(
  buildResourceIdentity({ ...sourceA, url: "https://a.example/photo/1?user=other&pass=rotated&_t=2" }),
  buildResourceIdentity(sourceA)
);

const storage = createStorage();
const files = new Map();
let downloadCount = 0;
const fileApi = {
  async download(url, onProgress) {
    downloadCount += 1;
    onProgress(25);
    return { tempFilePath: `temp-${downloadCount}` };
  },
  async save(temp) {
    const path = `local-${temp}`;
    files.set(path, 10);
    return { savedFilePath: path };
  },
  async getFileInfo(path) {
    if (!files.has(path)) throw new Error("not found");
    return { size: files.get(path) };
  },
  async remove(path) {
    files.delete(path);
  }
};

let clock = 0;
const service = createResourceCacheService(storage, fileApi, {
  maxBytes: 15,
  maxItems: 2,
  now: () => `2026-10-04T00:00:0${clock++}Z`
});
const one = await service.cacheResource(sourceA);
assert.equal(one.status, "done");
assert.equal(one.bytes, 10);
assert.equal(downloadCount, 1);
assert.equal(await service.getLocalPath(sourceA), one.local_path);
assert.equal(downloadCount, 1);

const second = await service.cacheResource({ ...sourceB, id: 2 });
assert.equal(second.status, "done");
assert.equal(downloadCount, 2);
assert.equal(service.getUsage().items, 1);
assert.equal(service.get(sourceA), null);
assert.equal(files.has(one.local_path), false);

const duplicateStorage = createStorage();
let release;
let duplicateDownloads = 0;
const duplicateApi = {
  async download() {
    duplicateDownloads += 1;
    await new Promise((resolve) => {
      release = resolve;
    });
    return { tempFilePath: "temp-duplicate" };
  },
  async save() {
    files.set("duplicate", 4);
    return { savedFilePath: "duplicate" };
  },
  async getFileInfo() {
    return { size: 4 };
  },
  async remove() {}
};
const duplicateService = createResourceCacheService(duplicateStorage, duplicateApi, { maxBytes: 100, maxItems: 10 });
const firstTask = duplicateService.cacheResource({ ...sourceA, type: "video", url: "https://same.example/video" });
const secondTask = duplicateService.cacheResource({ ...sourceA, type: "video", url: "https://same.example/video" });
assert.equal(duplicateDownloads, 1);
release();
assert.equal(await firstTask, await secondTask);

const interruptedStorage = createStorage({
  resource_cache_items: JSON.stringify([{ ...sourceA, identity: buildResourceIdentity(sourceA), status: "caching", local_path: "", bytes: 0 }])
});
const interruptedService = createResourceCacheService(interruptedStorage, fileApi);
assert.equal(interruptedService.get(sourceA).status, "failed");
assert.match(interruptedService.get(sourceA).last_error, /中断/);

const failedStorage = createStorage();
const failedApi = {
  async download() {
    throw new Error("network failed");
  },
  async save() {}
};
const failedService = createResourceCacheService(failedStorage, failedApi);
await assert.rejects(() => failedService.cacheResource(sourceA), /network failed/);
assert.equal(failedService.get(sourceA).status, "failed");

const invalidStorage = createStorage({
  resource_cache_items: JSON.stringify([{ ...sourceA, identity: buildResourceIdentity(sourceA), status: "done", local_path: "missing", bytes: 10 }])
});
const invalidService = createResourceCacheService(invalidStorage, fileApi);
assert.equal(await invalidService.getLocalPath(sourceA), "");
assert.equal(invalidService.get(sourceA), null);

console.log("resource cache service tests passed");
