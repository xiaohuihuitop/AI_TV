/**
 * AI:创建离线下载服务，负责下载记录读写。
 * @param {{get: function(string): (string|undefined), set: function(string, string): void, remove: function(string): void}} storage AI:本地存储读写函数。
 * @param {{download: function(string, function(number): void): Promise<{tempFilePath: string}>, save: function(string): Promise<{savedFilePath: string}>}} downloader AI:下载与保存实现。
 * @returns {{listDownloads: function(): Array, addDownload: function(Object, function(number): void): Promise<void>, removeDownload: function(string): Promise<void>}} AI:离线服务实例。
 */
export function createOfflineService(storage, downloader) {
  const key = "download_items";

  function listDownloads() {
    const value = storage.get(key);
    const list = value ? JSON.parse(value) : [];
    const normalized = list.map((entry) => normalizeEntry(entry));
    const filtered = normalized.filter((entry) => entry.type !== "article");
    if (filtered.length !== normalized.length) {
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
    const list = listDownloads().filter((entry) => entry.id !== item.id);
    const entry = normalizeEntry({
      ...item,
      status: "downloading",
      progress: 0,
      local_path: "",
      last_error: "",
      last_step: "初始化"
    });
    list.unshift(entry);
    saveList(list);
    const updateEntry = (updates) => {
      const latest = listDownloads();
      const target = latest.find((current) => current.id === item.id);
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
    const handleProgress = (value) => {
      const progress = normalizeProgress(value);
      updateEntry({ progress, status: "downloading", last_step: "下载中" });
      if (typeof onProgress === "function") {
        onProgress(progress);
      }
    };
    try {
      updateEntry({ last_step: "开始下载" });
      const result = await downloader.download(item.url, handleProgress);
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
    } catch (error) {
      markFailed(error, "下载失败");
      throw error;
    }
  }

  async function removeDownload(id) {
    const list = listDownloads().filter((entry) => entry.id !== id);
    saveList(list);
  }

  return {
    listDownloads,
    addDownload,
    removeDownload
  };
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
    const id = entry && entry.id ? String(entry.id) : "";
    if (!id) {
      return;
    }
    const status = entry && entry.status ? String(entry.status) : "";
    if (status === "done" && entry.local_path) {
      map[id] = { status: "done", progress: 100 };
      return;
    }
    if (status === "downloading") {
      map[id] = { status: "downloading", progress: normalizeProgress(entry.progress) };
    }
  });
  return map;
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
  const normalized = { ...entry };
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
