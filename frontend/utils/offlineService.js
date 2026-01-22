/**
 * AI:创建离线下载服务，负责下载记录读写。
 * @param {{get: function(string): (string|undefined), set: function(string, string): void, remove: function(string): void}} storage AI:本地存储读写函数。
 * @param {{download: function(string): Promise<{tempFilePath: string}>, save: function(string): Promise<{savedFilePath: string}>}} downloader AI:下载与保存实现。
 * @returns {{listDownloads: function(): Array, addDownload: function(Object): Promise<void>, removeDownload: function(string): Promise<void>}} AI:离线服务实例。
 */
export function createOfflineService(storage, downloader) {
  const key = "download_items";

  function listDownloads() {
    const value = storage.get(key);
    return value ? JSON.parse(value) : [];
  }

  function saveList(list) {
    storage.set(key, JSON.stringify(list));
  }

  async function addDownload(item) {
    const result = await downloader.download(item.url);
    const saved = await downloader.save(result.tempFilePath);
    const list = listDownloads();
    list.unshift({
      ...item,
      local_path: saved.savedFilePath,
      downloaded_at: new Date().toISOString()
    });
    saveList(list);
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

