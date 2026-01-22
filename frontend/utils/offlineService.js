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
    return list.map((entry) => normalizeEntry(entry));
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
    const list = listDownloads().filter((entry) => entry.id !== item.id);
    const entry = normalizeEntry({
      ...item,
      status: "downloading",
      progress: 0,
      local_path: ""
    });
    list.unshift(entry);
    saveList(list);
    const updateEntry = (updates) => {
      const target = list.find((current) => current.id === item.id);
      if (!target) {
        return;
      }
      Object.assign(target, updates);
      saveList(list);
    };
    const handleProgress = (value) => {
      const progress = normalizeProgress(value);
      updateEntry({ progress, status: "downloading" });
      if (typeof onProgress === "function") {
        onProgress(progress);
      }
    };
    const result = await downloader.download(item.url, handleProgress);
    const saved = await downloader.save(result.tempFilePath);
    updateEntry({
      local_path: saved.savedFilePath,
      downloaded_at: new Date().toISOString(),
      progress: 100,
      status: "done"
    });
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
  const status =
    normalized.status || (progress >= 100 || normalized.local_path ? "done" : "downloading");
  normalized.progress = progress;
  normalized.status = status;
  return normalized;
}

