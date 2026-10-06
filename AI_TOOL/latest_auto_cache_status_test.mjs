import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildResourceIdentity } from "../android/utils/resourceCacheService.js";
import { buildAutoCacheStatusMap, resolveAutoCacheStatus } from "../android/utils/autoCacheStatus.js";

const root = new URL("../", import.meta.url);
const latestSource = await readFile(new URL("android/pages/latest/index.vue", root), "utf8");
const statusSource = await readFile(new URL("android/utils/autoCacheStatus.js", root), "utf8");

const item = {
  type: "video",
  id: 7,
  url: "https://tv.xhhtop.top/public/videos/7.mp4?user=admin&pass=admin"
};
const identity = buildResourceIdentity(item);
const status = (entry) => resolveAutoCacheStatus(item, buildAutoCacheStatusMap([{ ...item, identity, ...entry }]));
assert.equal(status({ status: "caching" }), "caching");
assert.equal(status({ status: "done", local_path: "_doc/video.cache" }), "done");
assert.equal(status({ status: "failed", local_path: "" }), "failed");
assert.equal(resolveAutoCacheStatus(item, buildAutoCacheStatusMap([])), "online");

assert.match(statusSource, /export function buildAutoCacheStatusMap/);
assert.match(statusSource, /export function resolveAutoCacheStatus/);
assert.match(latestSource, /autoCacheStatusMap/);
assert.match(latestSource, /refreshAutoCacheStatus/);
assert.match(latestSource, /const cacheTask = service\.cacheResource\([\s\S]*?this\.refreshAutoCacheStatus\(\);[\s\S]*?cacheTask\s*\.then\(\(entry\)/);
assert.match(latestSource, /resolveAutoCacheStatusValue/);

console.log("latest automatic cache status tests passed");
