const activeDownloadTokens = new Set();

/**
 * AI:创建离线下载服务，负责下载记录读写。
 * @param {{get: function(string): (string|undefined), set: function(string, string): void, remove: function(string): void}} storage AI:本地存储读写函数。
 * @param {{download?: function(string, function(number): void): Promise<{tempFilePath: string}>, save?: function(string): Promise<{savedFilePath: string}>}} downloader AI:下载与保存实现。
 * @returns {{listDownloads: function(): Array, addDownload: function(Object, function(number): void): Promise<void>, removeDownload: function(Object|string): Promise<void>}} AI:离线服务实例。
 */
export function createOfflineService(storage, downloader) {
  const key = "download_items";

  function listDownloads() {
    const value = storage.get(key);
    if (!value) {
      return [];
    }
    let list;
    try {
      list = JSON.parse(value);
    } catch (error) {
      storage.remove(key);
      return [];
    }
    if (!Array.isArray(list)) {
      storage.remove(key);
      return [];
    }
    let changed = false;
    const normalized = list.map((entry) => {
      const next = normalizeEntry(entry);
      if (next.status === "downloading" && !activeDownloadTokens.has(next.download_token)) {
        changed = true;
        return {
          ...next,
          status: "failed",
          progress: 0,
          last_error: "下载已中断，请重新下载",
          last_step: "已中断"
        };
      }
      return next;
    });
    const filtered = normalized.filter((entry) => entry.type !== "article");
    if (changed || filtered.length !== list.length) {
      saveList(filtered);
    }
    return filtered;
  }

  function saveList(list) {
    storage.set(key, JSON.stringify(list));
  }

  async function addDownload(item, onProgress) {
    if (!item || !item.id) {
      throw new Error("缺少下载信息");
    }
    if (!item.url) {
      throw new Error("缺少下载地址");
    }
    if (item.type === "article") {
      throw new Error("图文不支持离线下载");
    }
    const identity = buildDownloadIdentity(item);
    if (!identity) {
      throw new Error("缺少下载身份信息");
    }
    const downloadToken = createDownloadToken(identity);
    activeDownloadTokens.add(downloadToken);
    const list = listDownloads().filter((entry) => buildDownloadIdentity(entry) !== identity);
    const entry = normalizeEntry({
      ...item,
      download_identity: identity,
      download_token: downloadToken,
      status: "downloading",
      progress: 0,
      local_path: "",
      cover_local_path: "",
      last_error: "",
      last_step: "初始化"
    });
    list.unshift(entry);
    saveList(list);
    const updateEntry = (updates) => {
      const latest = listDownloads();
      const target = latest.find((current) => current.download_token === downloadToken);
      if (!target) {
        return;
      }
      Object.assign(target, updates);
      saveList(latest);
    };
    const markFailed = (error, step) => {
      updateEntry({
        local_path: "",
        downloaded_at: new Date().toISOString(),
        progress: 0,
        status: "failed",
        last_error: formatErrorMessage(error),
        last_step: step || "失败"
      });
    };
    let lastPersistedProgress = 0;
    const handleProgress = (value) => {
      const progress = normalizeProgress(value);
      const persistedProgress = Math.floor(progress / 5) * 5;
      if (persistedProgress > lastPersistedProgress || progress >= 100) {
        lastPersistedProgress = persistedProgress;
        updateEntry({ progress, status: "downloading", last_step: "下载中" });
        if (typeof onProgress === "function") {
          onProgress(progress);
        }
      }
    };
    try {
      if (!downloader || typeof downloader.download !== "function") {
        throw new Error("缺少下载能力");
      }
      updateEntry({ last_step: "开始下载" });
      const result = await downloader.download(normalizeRemoteUrl(item.url), handleProgress);
      if (!result || !result.tempFilePath) {
        throw new Error("下载失败：缺少临时文件");
      }
      updateEntry({ last_step: "保存文件" });
      const saved = await saveDownloadedFile(downloader, result.tempFilePath);
      const localPath = saved && saved.savedFilePath ? saved.savedFilePath : "";
      if (!localPath) {
        throw new Error("保存失败");
      }
      updateEntry({
        local_path: localPath,
        downloaded_at: new Date().toISOString(),
        progress: 100,
        status: "done",
        last_error: "",
        last_step: "完成"
      });
      await tryDownloadCover(item, downloader, updateEntry);
    } catch (error) {
      markFailed(error, "下载失败");
      throw error;
    } finally {
      activeDownloadTokens.delete(downloadToken);
    }
  }

  async function removeDownload(itemOrIdentity) {
    const list = listDownloads();
    const identity = resolveDownloadIdentity(itemOrIdentity, list);
    const target = list.find((entry) => buildDownloadIdentity(entry) === identity);
    if (target && target.status === "downloading") {
      throw new Error("下载进行中，暂时不能删除");
    }
    saveList(list.filter((entry) => buildDownloadIdentity(entry) !== identity));
  }

  function clearDownloadPaths(itemOrIdentity, fields) {
    const allowedFields = Array.isArray(fields)
      ? fields.filter((field) => field === "local_path" || field === "cover_local_path")
      : [];
    if (allowedFields.length === 0) {
      return;
    }
    const list = listDownloads();
    const identity = resolveDownloadIdentity(itemOrIdentity, list);
    const target = list.find((entry) => buildDownloadIdentity(entry) === identity);
    if (!target) {
      return;
    }
    allowedFields.forEach((field) => {
      target[field] = "";
    });
    saveList(list);
  }

  return {
    listDownloads,
    addDownload,
    removeDownload,
    clearDownloadPaths
  };
}

/**
 * AI:构造跨服务器安全的下载身份。
 * @param {Object} item AI:清单或下载条目。
 * @returns {string} AI:由类型、服务端 ID 和资源地址组成的身份。
 */
export function buildDownloadIdentity(item) {
  if (!item || item.id === undefined || item.id === null) {
    return "";
  }
  const type = String(item.type || "video").trim() || "video";
  const id = String(item.id).trim();
  const url = normalizeIdentityUrl(item.url);
  if (!id || !url) {
    return "";
  }
  return JSON.stringify([type, id, url]);
}

function normalizeIdentityUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  const hashIndex = raw.indexOf("#");
  const withoutHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
  const queryIndex = withoutHash.indexOf("?");
  if (queryIndex < 0) {
    return withoutHash;
  }
  const base = withoutHash.slice(0, queryIndex);
  const stableQuery = withoutHash
    .slice(queryIndex + 1)
    .split("&")
    .filter((part) => part && !isVolatileIdentityParameter(part));
  return stableQuery.length > 0 ? `${base}?${stableQuery.join("&")}` : base;
}

function isVolatileIdentityParameter(part) {
  const separator = part.indexOf("=");
  const rawName = separator >= 0 ? part.slice(0, separator) : part;
  let decodedName = rawName;
  try {
    decodedName = decodeURIComponent(rawName.replace(/\+/g, "%20"));
  } catch (error) {
    decodedName = rawName;
  }
  return /^(?:user|pass|_t)$/i.test(decodedName);
}

/**
 * AI:依次删除下载文件；任一删除失败时保留下载记录供用户重试。
 * @param {Object} item AI:下载条目。
 * @param {function(string): Promise<void>} removeFile AI:文件删除实现。
 * @returns {Promise<void>} AI:删除完成。
 */
export async function removeDownloadFiles(item, removeFile) {
  const files = [
    ["cover_local_path", item && item.cover_local_path],
    ["local_path", item && item.local_path]
  ].filter(([, path]) => Boolean(path));
  const removedFields = [];
  for (const [field, path] of files) {
    try {
      await removeFile(path);
      removedFields.push(field);
    } catch (error) {
      if (error && typeof error === "object") {
        error.removedFields = removedFields.slice();
      }
      throw error;
    }
  }
}

/**
 * AI:将远端下载地址转换为 App 网络请求可用地址。
 * @param {string} value AI:原始地址。
 * @returns {string} AI:带 http/https 协议的远端地址。
 */
function normalizeRemoteUrl(value) {
  const url = String(value || "").trim();
  if (!url) {
    return "";
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `http://${url.replace(/^\/+/, "")}`;
}

/**
 * AI:下载封面并写入本地路径（失败不影响主流程）。
 * @param {Object} item AI:条目信息。
 * @param {{download: function(string, function(number): void): Promise<{tempFilePath: string}>, save: function(string): Promise<{savedFilePath: string}>}} downloader AI:下载器。
 * @param {function(Object): void} updateEntry AI:更新条目函数。
 * @returns {Promise<void>} AI:无返回值。
 */
async function tryDownloadCover(item, downloader, updateEntry) {
  const coverUrl =
    typeof item.cover === "string"
      ? item.cover.trim()
      : typeof item.cover_url === "string"
        ? item.cover_url.trim()
        : "";
  if (!coverUrl) {
    return;
  }
  try {
    const result = await downloader.download(normalizeRemoteUrl(coverUrl));
    if (!result || !result.tempFilePath) {
      return;
    }
    const saved = await saveDownloadedFile(downloader, result.tempFilePath);
    const localPath = saved && saved.savedFilePath ? saved.savedFilePath : "";
    if (!localPath) {
      return;
    }
    updateEntry({ cover_local_path: localPath });
  } catch (error) {
    return;
  }
}

/**
 * AI:构建下载状态映射，供页面快速判断下载状态。
 * @param {Array} list AI:下载列表。
 * @returns {Object} AI:状态映射。
 */
export function buildDownloadStatusMap(list) {
  const map = {};
  const items = Array.isArray(list) ? list : [];
  items.forEach((entry) => {
    const identity = buildDownloadIdentity(entry);
    if (!identity) {
      return;
    }
    const status = entry && entry.status ? String(entry.status) : "";
    if (status === "done" && entry.local_path) {
      map[identity] = {
        status: "done",
        progress: 100,
        local_path: entry.local_path || "",
        cover_local_path: entry.cover_local_path || ""
      };
      return;
    }
    if (status === "downloading") {
      map[identity] = {
        status: "downloading",
        progress: normalizeProgress(entry.progress),
        cover_local_path: entry.cover_local_path || ""
      };
    }
  });
  return map;
}

function createDownloadToken(identity) {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${identity.length}`;
}

function resolveDownloadIdentity(itemOrIdentity, list) {
  if (itemOrIdentity && typeof itemOrIdentity === "object") {
    return buildDownloadIdentity(itemOrIdentity);
  }
  const raw = String(itemOrIdentity || "");
  if (raw.startsWith("[")) {
    return raw;
  }
  const matches = list.filter((entry) => String(entry.id) === raw);
  return matches.length === 1 ? buildDownloadIdentity(matches[0]) : "";
}

/**
 * AI:标准化进度数值。
 * @param {number} value AI:原始进度值。
 * @returns {number} AI:归一化后的进度。
 */
function normalizeProgress(value) {
  const progress = Number(value);
  if (!Number.isFinite(progress)) {
    return 0;
  }
  return Math.min(100, Math.max(0, progress));
}

/**
 * AI:补全下载条目的默认字段。
 * @param {Object} entry AI:原始条目。
 * @returns {Object} AI:标准化条目。
 */
function normalizeEntry(entry) {
  const normalized = { ...(entry || {}) };
  const progress =
    typeof normalized.progress === "number"
      ? normalizeProgress(normalized.progress)
      : normalized.local_path
        ? 100
        : 0;
  const hasPath = !!normalized.local_path;
  let status = normalized.status;
  if (!status) {
    status = progress >= 100 || hasPath ? "done" : "downloading";
  }
  if (!hasPath && progress >= 100 && status === "done") {
    status = "failed";
  }
  normalized.download_identity = buildDownloadIdentity(normalized);
  normalized.download_token = String(normalized.download_token || "");
  normalized.progress = status === "failed" ? 0 : progress;
  normalized.status = status;
  if (!normalized.last_error) {
    normalized.last_error = "";
  }
  if (!normalized.last_step) {
    normalized.last_step = "";
  }
  return normalized;
}

/**
 * AI:格式化错误信息，便于离线列表展示。
 * @param {unknown} error AI:错误对象。
 * @returns {string} AI:可读错误信息。
 */
function formatErrorMessage(error) {
  if (!error) {
    return "未知错误";
  }
  if (typeof error === "string") {
    return error;
  }
  const message = error && (error.errMsg || error.message) ? error.errMsg || error.message : "";
  return message || "未知错误";
}

/**
 * AI:保存下载文件。
 * @param {Object} downloader AI:下载器。
 * @param {string} tempFilePath AI:临时文件路径。
 * @returns {Promise<{savedFilePath: string}>} AI:保存结果。
 */
async function saveDownloadedFile(downloader, tempFilePath) {
  if (downloader && typeof downloader.save === "function") {
    return downloader.save(tempFilePath);
  }
  throw new Error("缺少保存能力");
}
