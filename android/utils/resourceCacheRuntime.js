import {
  createResourceCacheService,
  DEFAULT_RESOURCE_CACHE_MAX_BYTES,
  DEFAULT_RESOURCE_CACHE_MAX_ITEMS
} from "./resourceCacheService.js";

export const resourceCacheConfigKey = "resource_cache_config";

export const defaultResourceCacheConfig = {
  enabled: true,
  wifiOnly: true,
  maxBytes: DEFAULT_RESOURCE_CACHE_MAX_BYTES,
  maxItems: DEFAULT_RESOURCE_CACHE_MAX_ITEMS
};

export function createUniStorage() {
  return {
    get: (key) => uni.getStorageSync(key),
    set: (key, value) => uni.setStorageSync(key, value),
    remove: (key) => uni.removeStorageSync(key)
  };
}

export function loadResourceCacheConfig(storage = createUniStorage()) {
  const raw = storage.get(resourceCacheConfigKey);
  if (!raw) {
    return { ...defaultResourceCacheConfig };
  }
  try {
    const parsed = JSON.parse(raw);
    const normalized = normalizeResourceCacheConfig(parsed);
    return {
      ...defaultResourceCacheConfig,
      enabled: normalized.enabled,
      wifiOnly: normalized.wifiOnly
    };
  } catch (error) {
    return { ...defaultResourceCacheConfig };
  }
}

export function saveResourceCacheConfig(config, storage = createUniStorage()) {
  const normalized = normalizeResourceCacheConfig(config);
  const persisted = { enabled: normalized.enabled, wifiOnly: normalized.wifiOnly };
  storage.set(resourceCacheConfigKey, JSON.stringify(persisted));
  return normalized;
}

export function normalizeResourceCacheConfig(config) {
  const value = config && typeof config === "object" ? config : {};
  const maxBytes = Number(value.maxBytes);
  const maxItems = Number(value.maxItems);
  return {
    enabled: value.enabled !== false,
    wifiOnly: value.wifiOnly !== false,
    maxBytes:
      Number.isFinite(maxBytes) && maxBytes > 0
        ? Math.floor(maxBytes)
        : defaultResourceCacheConfig.maxBytes,
    maxItems:
      Number.isFinite(maxItems) && maxItems > 0
        ? Math.floor(maxItems)
        : defaultResourceCacheConfig.maxItems
  };
}

export function createUniResourceFileApi() {
  return {
    download(url, onProgress) {
      return new Promise((resolve, reject) => {
        if (typeof uni === "undefined" || typeof uni.downloadFile !== "function") {
          reject(new Error("uni.downloadFile 不可用"));
          return;
        }
        const task = uni.downloadFile({
          url,
          success: (res) => {
            if (res.statusCode !== 200 || !res.tempFilePath) {
              reject(new Error(`资源缓存下载失败: ${res.statusCode}`));
              return;
            }
            resolve({ tempFilePath: res.tempFilePath });
          },
          fail: reject
        });
        if (task && typeof task.onProgressUpdate === "function") {
          task.onProgressUpdate((res) => {
            if (typeof onProgress === "function") {
              onProgress(Number(res.progress) || 0);
            }
          });
        }
      });
    },
    save(tempFilePath) {
      return new Promise((resolve, reject) => {
        if (typeof uni === "undefined" || typeof uni.saveFile !== "function") {
          reject(new Error("uni.saveFile 不可用"));
          return;
        }
        uni.saveFile({
          tempFilePath,
          success: (res) => resolve({ savedFilePath: res.savedFilePath }),
          fail: reject
        });
      });
    },
    saveWithPath(tempFilePath, filePath) {
      return new Promise((resolve, reject) => {
        if (typeof uni === "undefined" || typeof uni.saveFile !== "function") {
          reject(new Error("uni.saveFile 不可用"));
          return;
        }
        uni.saveFile({
          tempFilePath,
          filePath,
          success: (res) => resolve({ savedFilePath: res.savedFilePath || filePath }),
          fail: reject
        });
      });
    },
    getFileInfo(filePath) {
      return new Promise((resolve, reject) => {
        if (typeof uni === "undefined" || typeof uni.getFileInfo !== "function") {
          reject(new Error("uni.getFileInfo 不可用"));
          return;
        }
        uni.getFileInfo({ filePath, success: resolve, fail: reject });
      });
    },
    remove(filePath) {
      return removeLocalFile(filePath);
    }
  };
}

export function createAppResourceCache(
  storage = createUniStorage(),
  fileApi = createUniResourceFileApi(),
  config = loadResourceCacheConfig(storage)
) {
  return createResourceCacheService(storage, fileApi, config);
}

export function applyCachedResourcePaths(items, service) {
  const list = Array.isArray(items) ? items : [];
  if (!service || typeof service.get !== "function") {
    return list;
  }
  return list.map((item) => {
    const applyOne = (value, type = value && value.type) => {
      if (!value || !value.url) return value;
      const entry = service.get({ ...value, type: type || "video", id: value.id || value.url });
      return entry && entry.status === "done" && entry.local_path
        ? { ...value, local_path: entry.local_path }
        : value;
    };
    const next = applyOne(item);
    if (!Array.isArray(next.photos)) {
      return next;
    }
    const photos = next.photos.map((photo) => applyOne(photo, "photo"));
    const cover = photos.find((photo) => photo.url === next.cover) || photos[0];
    return {
      ...next,
      photos,
      ...(cover && cover.local_path ? { cover: cover.local_path } : {})
    };
  });
}

export function getNetworkType() {
  return new Promise((resolve) => {
    if (typeof uni === "undefined" || typeof uni.getNetworkType !== "function") {
      resolve("unknown");
      return;
    }
    uni.getNetworkType({
      success: (res) => resolve(String((res && res.networkType) || "unknown").toLowerCase()),
      fail: () => resolve("unknown")
    });
  });
}

export async function canAutoCache(config = loadResourceCacheConfig()) {
  if (!config.enabled) {
    return false;
  }
  if (!config.wifiOnly) {
    return true;
  }
  return (await getNetworkType()) === "wifi";
}

export function createLocalTextAdapter() {
  return {
    read(filePath) {
      return readLocalText(filePath);
    }
  };
}

export function toWebViewPath(filePath) {
  const value = String(filePath || "").trim();
  if (!value) {
    return "";
  }
  if (/^(?:https?:|file:)/i.test(value)) {
    return value;
  }
  if (typeof plus !== "undefined" && plus.io && typeof plus.io.convertLocalFileSystemURL === "function") {
    try {
      const converted = plus.io.convertLocalFileSystemURL(value);
      if (converted) {
        return /^file:\/\//i.test(converted) ? converted : `file://${converted}`;
      }
    } catch (error) {
      return value;
    }
  }
  return value.startsWith("/") ? `file://${value}` : value;
}

function readLocalText(filePath) {
  return new Promise((resolve, reject) => {
    if (typeof uni !== "undefined" && typeof uni.getFileSystemManager === "function") {
      const manager = uni.getFileSystemManager();
      manager.readFile({
        filePath: String(filePath).replace(/^file:\/\//, ""),
        encoding: "utf8",
        success: (res) => resolve(res.data),
        fail: reject
      });
      return;
    }
    if (typeof plus !== "undefined" && plus.io && typeof plus.io.resolveLocalFileSystemURL === "function") {
      plus.io.resolveLocalFileSystemURL(
        filePath,
        (entry) => {
          entry.file((file) => {
            const reader = new plus.io.FileReader();
            reader.onloadend = (event) => resolve(event.target.result || "");
            reader.onerror = reject;
            reader.readAsText(file, "utf-8");
          }, reject);
        },
        reject
      );
      return;
    }
    reject(new Error("当前环境不支持本地文本读取"));
  });
}

function removeLocalFile(filePath) {
  return new Promise((resolve, reject) => {
    const normalized = String(filePath || "").replace(/^file:\/\//, "");
    if (typeof uni !== "undefined" && typeof uni.removeSavedFile === "function") {
      uni.removeSavedFile({
        filePath: normalized,
        success: resolve,
        fail: () => removeWithPlus(filePath, resolve, reject)
      });
      return;
    }
    removeWithPlus(filePath, resolve, reject);
  });
}

function removeWithPlus(filePath, resolve, reject) {
  if (typeof plus === "undefined" || !plus.io || typeof plus.io.resolveLocalFileSystemURL !== "function") {
    reject(new Error("删除缓存文件失败"));
    return;
  }
  plus.io.resolveLocalFileSystemURL(
    filePath,
    (entry) => entry.remove(resolve, () => reject(new Error("删除缓存文件失败"))),
    () => reject(new Error("缓存文件不存在"))
  );
}
