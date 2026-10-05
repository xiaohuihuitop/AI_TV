export const RESOURCE_CACHE_KEY = "resource_cache_items";
export const DEFAULT_RESOURCE_CACHE_MAX_BYTES = 10 * 1024 * 1024 * 1024;
export const DEFAULT_RESOURCE_CACHE_MAX_ITEMS = 100;

const activeTasks = new Map();

/**
 * AI:创建独立资源缓存服务，不与用户主动下载记录混用。
 * @param {{get: function(string): (string|undefined), set: function(string, string): void, remove: function(string): void}} storage AI:本地存储适配器。
 * @param {{download?: function(string, function(number): void): Promise<Object>, save?: function(string): Promise<Object>, getFileInfo?: function(string): Promise<Object>, remove?: function(string): Promise<void>}} fileApi AI:文件能力适配器。
 * @param {{maxBytes?: number, maxItems?: number, now?: function(): string}} options AI:缓存策略。
 * @returns {Object} AI:缓存服务。
 */
export function createResourceCacheService(storage, fileApi, options = {}) {
  const maxBytes = normalizeLimit(options.maxBytes, DEFAULT_RESOURCE_CACHE_MAX_BYTES);
  const maxItems = normalizeLimit(options.maxItems, DEFAULT_RESOURCE_CACHE_MAX_ITEMS);
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();

  function list() {
    const raw = storage.get(RESOURCE_CACHE_KEY);
    if (!raw) {
      return [];
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      storage.remove(RESOURCE_CACHE_KEY);
      return [];
    }
    if (!Array.isArray(parsed)) {
      storage.remove(RESOURCE_CACHE_KEY);
      return [];
    }
    const normalized = parsed.map(normalizeEntry).filter((entry) => entry.identity && entry.url);
    let changed = normalized.length !== parsed.length;
    const recovered = normalized.map((entry) => {
      if (entry.status === "caching" && !activeTasks.has(entry.identity)) {
        changed = true;
        return { ...entry, status: "failed", last_error: "缓存已中断，请重试" };
      }
      return entry;
    });
    if (changed) {
      save(recovered);
    }
    return recovered;
  }

  function save(items) {
    storage.set(RESOURCE_CACHE_KEY, JSON.stringify(items));
  }

  function get(itemOrIdentity) {
    const identity = resolveIdentity(itemOrIdentity);
    if (!identity) {
      return null;
    }
    return list().find((entry) => entry.identity === identity) || null;
  }

  async function getLocalPath(item) {
    const entry = get(item);
    if (!entry || entry.status !== "done" || !entry.local_path) {
      return "";
    }
    if (!(await isFileUsable(fileApi, entry.local_path, entry.bytes))) {
      await remove(item);
      return "";
    }
    touch(item);
    return entry.local_path;
  }

  async function cacheResource(item, onProgress) {
    const identity = buildResourceIdentity(item);
    if (!identity || !item || !item.url) {
      throw new Error("缺少缓存资源信息");
    }
    const existingTask = activeTasks.get(identity);
    if (existingTask) {
      return existingTask;
    }
    const existing = get(identity);
    if (existing && existing.status === "done" && (await isFileUsable(fileApi, existing.local_path, existing.bytes))) {
      touch(identity);
      return existing;
    }
    const task = cacheResourceInternal(item, identity, onProgress);
    activeTasks.set(identity, task);
    try {
      return await task;
    } finally {
      activeTasks.delete(identity);
    }
  }

  async function cacheResourceInternal(item, identity, onProgress) {
    const startedAt = now();
    upsert({
      ...item,
      identity,
      status: "caching",
      local_path: "",
      bytes: 0,
      cached_at: "",
      last_used_at: startedAt,
      last_error: ""
    });
    let tempFilePath = "";
    let savedPath = "";
    try {
      if (!fileApi || typeof fileApi.download !== "function" || typeof fileApi.save !== "function") {
        throw new Error("缺少文件缓存能力");
      }
      const result = await fileApi.download(normalizeRemoteUrl(item.url), (progress) => {
        if (typeof onProgress === "function") {
          onProgress(normalizeProgress(progress));
        }
      });
      tempFilePath = result && result.tempFilePath ? result.tempFilePath : "";
      if (!tempFilePath) {
        throw new Error("下载失败：缺少临时文件");
      }
      const itemWithPath = {
        ...item,
        cacheFileName: item.cacheFileName || ""
      };
      const saved = itemWithPath.cacheFileName && typeof fileApi.saveWithPath === "function"
        ? await fileApi.saveWithPath(tempFilePath, itemWithPath.cacheFileName)
        : await fileApi.save(tempFilePath);
      savedPath = saved && (saved.savedFilePath || saved.filePath) ? saved.savedFilePath || saved.filePath : "";
      if (!savedPath) {
        throw new Error("保存缓存失败");
      }
      const bytes = await resolveFileBytes(fileApi, savedPath, item.size_bytes);
      if (!(await isFileUsable(fileApi, savedPath, bytes))) {
        throw new Error("缓存文件校验失败");
      }
      const entry = upsert({
        ...item,
        identity,
        status: "done",
        local_path: savedPath,
        bytes,
        cached_at: now(),
        last_used_at: now(),
        last_error: ""
      });
      await enforceLimits(identity);
      return entry;
    } catch (error) {
      if (savedPath && typeof fileApi.remove === "function") {
        await removeFileQuietly(fileApi, savedPath);
      } else if (tempFilePath && typeof fileApi.removeTemp === "function") {
        await removeFileQuietly(fileApi, tempFilePath);
      }
      upsert({
        ...item,
        identity,
        status: "failed",
        local_path: "",
        bytes: 0,
        last_error: formatError(error),
        last_used_at: now()
      });
      throw error;
    }
  }

  function upsert(entry) {
    const next = normalizeEntry(entry);
    const items = list().filter((current) => current.identity !== next.identity);
    items.unshift(next);
    save(items);
    return next;
  }

  function touch(itemOrIdentity) {
    const identity = resolveIdentity(itemOrIdentity);
    if (!identity) {
      return null;
    }
    const items = list();
    const target = items.find((entry) => entry.identity === identity);
    if (!target) {
      return null;
    }
    target.last_used_at = now();
    save(items);
    return target;
  }

  async function remove(itemOrIdentity) {
    const identity = resolveIdentity(itemOrIdentity);
    if (!identity) {
      return false;
    }
    const items = list();
    const target = items.find((entry) => entry.identity === identity);
    if (!target) {
      return false;
    }
    if (target.local_path && fileApi && typeof fileApi.remove === "function") {
      try {
        await fileApi.remove(target.local_path);
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }
    }
    save(items.filter((entry) => entry.identity !== identity));
    return true;
  }

  async function clearExpired(protectedIdentities = []) {
    const protectedSet = new Set(protectedIdentities.map(resolveIdentity).filter(Boolean));
    const items = list();
    const removable = items
      .filter((entry) => entry.status === "done" && !protectedSet.has(entry.identity))
      .sort((a, b) => String(a.last_used_at || a.cached_at).localeCompare(String(b.last_used_at || b.cached_at)));
    let totalBytes = items.reduce((sum, entry) => sum + (entry.status === "done" ? entry.bytes : 0), 0);
    let totalItems = items.filter((entry) => entry.status === "done").length;
    for (const entry of removable) {
      if (totalBytes <= maxBytes && totalItems <= maxItems) {
        break;
      }
      await remove(entry.identity);
      totalBytes -= entry.bytes;
      totalItems -= 1;
    }
    return list();
  }

  async function clearAll(protectedIdentities = []) {
    const protectedSet = new Set(protectedIdentities.map(resolveIdentity).filter(Boolean));
    for (const entry of list()) {
      if (!protectedSet.has(entry.identity)) {
        await remove(entry.identity);
      }
    }
    return list();
  }

  async function enforceLimits(protectedIdentity) {
    return clearExpired([protectedIdentity]);
  }

  function getUsage() {
    const items = list().filter((entry) => entry.status === "done");
    return {
      bytes: items.reduce((sum, entry) => sum + entry.bytes, 0),
      items: items.length,
      maxBytes,
      maxItems
    };
  }

  return { list, get, getLocalPath, cacheResource, touch, remove, clearExpired, clearAll, getUsage };
}

export function buildResourceIdentity(item) {
  if (!item) {
    return "";
  }
  const type = String(item.type || "video").trim() || "video";
  const url = normalizeIdentityUrl(item.url);
  const rawId = item.id === undefined || item.id === null ? url : String(item.id).trim();
  return rawId && url ? JSON.stringify([type, rawId, url]) : "";
}

function resolveIdentity(itemOrIdentity) {
  return typeof itemOrIdentity === "string" ? itemOrIdentity : buildResourceIdentity(itemOrIdentity);
}

function normalizeEntry(entry) {
  return {
    type: String(entry && entry.type ? entry.type : "video"),
    id: entry && entry.id !== undefined ? entry.id : "",
    title: String((entry && entry.title) || ""),
    url: String((entry && entry.url) || ""),
    identity: String((entry && entry.identity) || buildResourceIdentity(entry)),
    format: String((entry && entry.format) || ""),
    local_path: String((entry && entry.local_path) || ""),
    bytes: normalizeBytes(entry && entry.bytes),
    status: String((entry && entry.status) || "failed"),
    cached_at: String((entry && entry.cached_at) || ""),
    last_used_at: String((entry && entry.last_used_at) || ""),
    last_error: String((entry && entry.last_error) || "")
  };
}

async function resolveFileBytes(fileApi, path, fallback) {
  if (fileApi && typeof fileApi.getFileInfo === "function") {
    try {
      const info = await fileApi.getFileInfo(path);
      return normalizeBytes(info && (info.size || info.fileSize)) || normalizeBytes(fallback);
    } catch (error) {
      return normalizeBytes(fallback);
    }
  }
  return normalizeBytes(fallback);
}

async function isFileUsable(fileApi, path, expectedBytes) {
  if (!path) {
    return false;
  }
  if (fileApi && typeof fileApi.getFileInfo === "function") {
    try {
      const info = await fileApi.getFileInfo(path);
      const actualBytes = normalizeBytes(info && (info.size || info.fileSize));
      return actualBytes > 0 && (!expectedBytes || actualBytes === expectedBytes);
    } catch (error) {
      return false;
    }
  }
  return true;
}

function normalizeIdentityUrl(value) {
  const raw = String(value || "").trim().split("#")[0];
  const queryIndex = raw.indexOf("?");
  if (queryIndex < 0) return raw;
  const base = raw.slice(0, queryIndex);
  const stable = raw.slice(queryIndex + 1).split("&").filter((part) => {
    const name = part.split("=", 1)[0];
    let decoded = name;
    try { decoded = decodeURIComponent(name.replace(/\+/g, "%20")); } catch (error) {}
    return !/^(user|pass|_t)$/i.test(decoded);
  });
  return stable.length ? `${base}?${stable.join("&")}` : base;
}

function normalizeRemoteUrl(value) {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : `http://${url.replace(/^\/+/, "")}`;
}

function normalizeLimit(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizeBytes(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function normalizeProgress(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 0;
}

function formatError(error) {
  return String((error && (error.message || error.errMsg)) || error || "未知错误");
}

function isNotFoundError(error) {
  return /not found|不存在|no such file/i.test(formatError(error));
}

async function removeFileQuietly(fileApi, path) {
  try {
    await fileApi.remove(path);
  } catch (error) {
    return;
  }
}
