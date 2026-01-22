import { normalizeIndexItems, createStorageAdapter } from "../frontend/utils/indexService.js";

const raw = {
  items: [
    { id: "b", type: "video", title: "B", published_at: "2026-01-21T10:00:00+08:00" },
    { id: "a", type: "article", title: "A", published_at: "2026-01-21T12:00:00+08:00" }
  ]
};

const { items } = normalizeIndexItems(raw);
if (items[0].id !== "a") {
  throw new Error("排序未按 published_at 倒序");
}

const memory = new Map();
const adapter = createStorageAdapter({
  get: (key) => memory.get(key),
  set: (key, value) => memory.set(key, value),
  remove: (key) => memory.delete(key)
});

adapter.setJson("index_cache", raw);
const cached = adapter.getJson("index_cache");
if (!cached || cached.items.length !== 2) {
  throw new Error("缓存写入/读取失败");
}

console.log("ok");
