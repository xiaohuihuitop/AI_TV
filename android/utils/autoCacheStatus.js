import { buildResourceIdentity } from "./resourceCacheService.js";

export function buildAutoCacheStatusMap(entries) {
  return (Array.isArray(entries) ? entries : []).reduce((map, entry) => {
    if (entry && entry.identity) {
      map[entry.identity] = normalizeAutoCacheStatus(entry);
    }
    return map;
  }, {});
}

export function resolveAutoCacheStatus(item, statusMap) {
  const identity = item && item.identity ? item.identity : buildResourceIdentity(item);
  const entry = identity && statusMap ? statusMap[identity] : "";
  return entry || "online";
}

function normalizeAutoCacheStatus(entry) {
  if (entry.status === "done" && entry.local_path) {
    return "done";
  }
  if (entry.status === "caching") {
    return "caching";
  }
  if (entry.status === "failed") {
    return "failed";
  }
  return "online";
}
