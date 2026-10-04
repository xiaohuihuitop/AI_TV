import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  deriveFeedViewState,
  resolveCachedManifest,
  resolveIndexLoadState,
  validateIndexManifest
} from "../android/utils/indexState.js";
import { createStorageAdapter } from "../android/utils/indexService.js";

const validManifest = {
  items: [
    {
      id: 1,
      type: "video",
      title: "测试视频",
      url: "https://server-a.example/public/videos/1/download"
    }
  ]
};
const sourceUrl = "https://server-a.example/public/index.json?user=admin&pass=admin";
const otherSourceUrl = "https://server-b.example/public/index.json?user=admin&pass=admin";
const cachedManifest = {
  sourceUrl,
  data: validManifest
};

assert.deepEqual(validateIndexManifest(validManifest), {
  valid: true,
  data: validManifest
});
assert.deepEqual(validateIndexManifest({ items: "not-an-array" }), {
  valid: false,
  message: "服务器返回的数据格式不正确"
});
assert.deepEqual(validateIndexManifest("{bad json"), {
  valid: false,
  message: "服务器返回的数据格式不正确"
});
for (const invalidManifest of [
  { items: [null] },
  { items: [{}] },
  { items: [{ id: 1, type: "video", title: "缺少地址" }] },
  { items: [{ id: 1, type: "unsupported", title: "未知类型", url: "https://example.com/1" }] },
  { items: [{ id: { value: 1 }, type: "video", title: "对象 ID", url: "https://example.com/1" }] },
  { items: [{ id: 1, type: "video", title: "对象标题", url: { href: "https://example.com/1" } }] },
  { items: [{ id: 1, type: "video", title: "伪协议", url: "javascript:alert(1)" }] }
]) {
  assert.deepEqual(validateIndexManifest(invalidManifest), {
    valid: false,
    message: "服务器返回的数据格式不正确"
  });
}

assert.deepEqual(resolveCachedManifest(cachedManifest, sourceUrl), {
  valid: true,
  data: validManifest
});
assert.deepEqual(resolveCachedManifest(cachedManifest, otherSourceUrl), {
  valid: false
});
assert.deepEqual(resolveCachedManifest(validManifest, sourceUrl), {
  valid: false
});

assert.equal(
  resolveIndexLoadState({ statusCode: 200, data: validManifest, cachedData: null }).kind,
  "fresh"
);
assert.deepEqual(
  resolveIndexLoadState({
    statusCode: 401,
    data: null,
    cachedData: cachedManifest,
    sourceUrl
  }),
  {
    kind: "error",
    message: "服务器认证失败，请检查地址和账号密码"
  }
);
assert.deepEqual(
  resolveIndexLoadState({
    statusCode: 503,
    data: null,
    cachedData: cachedManifest,
    sourceUrl
  }),
  {
    kind: "cache",
    data: validManifest,
    notice: "无法连接服务器，当前显示缓存内容"
  }
);
assert.deepEqual(
  resolveIndexLoadState({
    statusCode: 503,
    data: null,
    cachedData: cachedManifest,
    sourceUrl: otherSourceUrl
  }),
  {
    kind: "error",
    message: "无法连接服务器，请检查服务是否启动或地址是否正确"
  }
);
assert.deepEqual(
  resolveIndexLoadState({
    statusCode: 503,
    data: null,
    cachedData: validManifest,
    sourceUrl
  }),
  {
    kind: "error",
    message: "无法连接服务器，请检查服务是否启动或地址是否正确"
  }
);
assert.deepEqual(
  resolveIndexLoadState({ statusCode: 200, data: {}, cachedData: null }),
  {
    kind: "error",
    message: "服务器返回的数据格式不正确"
  }
);
assert.deepEqual(
  resolveIndexLoadState({ statusCode: 0, data: null, cachedData: null }),
  {
    kind: "error",
    message: "无法连接服务器，请检查服务是否启动或地址是否正确"
  }
);

assert.equal(deriveFeedViewState({ loading: true, error: "", itemCount: 0 }), "loading");
assert.equal(deriveFeedViewState({ loading: false, error: "连接失败", itemCount: 0 }), "error");
assert.equal(deriveFeedViewState({ loading: false, error: "", itemCount: 0 }), "empty");
assert.equal(deriveFeedViewState({ loading: true, error: "", itemCount: 1 }), "content");

const storage = new Map([["broken", "{not-json"]]);
const adapter = createStorageAdapter({
  get: (key) => storage.get(key),
  set: (key, value) => storage.set(key, value),
  remove: (key) => storage.delete(key)
});
assert.equal(adapter.getJson("broken"), null);
assert.equal(storage.has("broken"), false);

const latestSource = await readFile(
  new URL("../android/pages/latest/index.vue", import.meta.url),
  "utf8"
);
assert.match(latestSource, /renderedSourceUrl:\s*""/);
assert.match(
  latestSource,
  /this\.renderedSourceUrl\s*&&\s*this\.renderedSourceUrl\s*!==\s*normalizedUrl[\s\S]*?this\.videoItems\s*=\s*\[\][\s\S]*?this\.articleItems\s*=\s*\[\]/
);
assert.match(
  latestSource,
  /this\.renderedSourceUrl\s*=\s*normalizedUrl[\s\S]*?this\.applyItems\(state\.data/
);
assert.match(latestSource, /sourceUrl:\s*normalizedUrl/);
assert.match(
  latestSource,
  /adapter\.setJson\(indexCacheKey,\s*\{\s*sourceUrl:\s*normalizedUrl,\s*data:\s*state\.data\s*\}\)/s
);
assert.match(
  latestSource,
  /resolveCachedManifest\(adapter\.getJson\(indexCacheKey\),\s*normalizedUrl\)/s
);

console.log("android latest state tests passed");
