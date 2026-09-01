import { updateManifestUrl } from "./appConfig.js";

export const DEFAULT_UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

const VERSION_PATTERN = /^\d+(?:\.\d+){0,2}$/;

/**
 * AI:将版本字符串转换为可比较的数字数组。
 * @param {string} value AI:版本字符串。
 * @returns {number[]} AI:三段版本数组。
 */
function parseVersion(value) {
  const text = String(value || "").trim();
  if (!VERSION_PATTERN.test(text)) {
    throw new Error("版本格式无效");
  }
  const parts = text.split(".").map((part) => Number(part));
  while (parts.length < 3) {
    parts.push(0);
  }
  if (parts.some((part) => !Number.isSafeInteger(part) || part < 0)) {
    throw new Error("版本格式无效");
  }
  return parts;
}

/**
 * AI:比较两个版本号。
 * @param {string} left AI:左侧版本。
 * @param {string} right AI:右侧版本。
 * @returns {-1|0|1} AI:比较结果。
 */
export function compareVersions(left, right) {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] < rightParts[index]) {
      return -1;
    }
    if (leftParts[index] > rightParts[index]) {
      return 1;
    }
  }
  return 0;
}

/**
 * AI:校验并标准化远端 WGT 更新清单。
 * @param {Object|string} raw AI:服务端返回的清单。
 * @returns {{version: string, version_code?: number, wgt_url: string, size_bytes?: number}} AI:标准化清单。
 */
export function validateUpdateManifest(raw) {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch (error) {
      throw new Error("更新清单格式无效");
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("更新清单格式无效");
  }

  const version = String(value.version || "").trim();
  parseVersion(version);

  const wgtUrl = String(value.wgt_url || "").trim();
  let parsedUrl;
  try {
    parsedUrl = new URL(wgtUrl);
  } catch (error) {
    throw new Error("WGT 地址无效");
  }
  if (parsedUrl.protocol !== "https:") {
    throw new Error("WGT 地址必须使用 HTTPS");
  }
  if (!/\.wgt$/i.test(parsedUrl.pathname)) {
    throw new Error("WGT 地址必须指向 .wgt 文件");
  }

  const normalized = { version, wgt_url: wgtUrl };
  if (value.version_code !== undefined && value.version_code !== null) {
    if (!Number.isSafeInteger(value.version_code) || value.version_code <= 0) {
      throw new Error("version_code 无效");
    }
    normalized.version_code = value.version_code;
  }
  if (value.size_bytes !== undefined && value.size_bytes !== null) {
    if (!Number.isSafeInteger(value.size_bytes) || value.size_bytes <= 0) {
      throw new Error("size_bytes 无效");
    }
    normalized.size_bytes = value.size_bytes;
  }
  return normalized;
}

/**
 * AI:判断更新清单是否高于当前版本。
 * @param {string} currentVersion AI:当前版本。
 * @param {{version: string}} manifest AI:更新清单。
 * @returns {boolean} AI:是否存在新版本。
 */
export function isUpdateAvailable(currentVersion, manifest) {
  return compareVersions(currentVersion, manifest.version) < 0;
}

function errorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error || "未知错误");
}

function safeWarn(message, error) {
  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(`[app-update] ${message}: ${errorMessage(error)}`);
  }
}

/**
 * AI:创建可注入依赖的自动更新服务。
 * @param {Object} deps AI:运行时、网络和文件操作适配器。
 * @param {{checkIntervalMs?: number}} options AI:更新检查选项。
 * @returns {{check: function(): Promise<Object>}} AI:更新服务。
 */
export function createUpdateService(deps = {}, options = {}) {
  const checkIntervalMs = Number.isFinite(options.checkIntervalMs)
    ? Math.max(0, options.checkIntervalMs)
    : DEFAULT_UPDATE_CHECK_INTERVAL_MS;
  let inFlight = null;

  function getNow() {
    return typeof deps.now === "function" ? Number(deps.now()) : Date.now();
  }

  function getLastCheckAt() {
    if (typeof deps.getLastCheckAt !== "function") {
      return 0;
    }
    const value = Number(deps.getLastCheckAt());
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  async function runCheck() {
    if (typeof deps.getCurrentVersion !== "function" || typeof deps.requestManifest !== "function") {
      return { status: "skipped" };
    }

    if (typeof deps.isPlaybackActive === "function" && deps.isPlaybackActive()) {
      return { status: "blocked-playing" };
    }

    const now = getNow();
    const lastCheckAt = getLastCheckAt();
    if (lastCheckAt > 0 && now >= lastCheckAt && now - lastCheckAt < checkIntervalMs) {
      return { status: "cooldown" };
    }
    if (typeof deps.setLastCheckAt === "function") {
      deps.setLastCheckAt(now);
    }

    let currentVersion;
    try {
      currentVersion = await deps.getCurrentVersion();
    } catch (error) {
      safeWarn("读取当前版本失败", error);
      return { status: "version-failed" };
    }
    if (!currentVersion) {
      return { status: "skipped" };
    }

    let rawManifest;
    try {
      rawManifest = await deps.requestManifest();
    } catch (error) {
      safeWarn("读取更新清单失败", error);
      return { status: "request-failed" };
    }

    let manifest;
    try {
      manifest = validateUpdateManifest(rawManifest);
    } catch (error) {
      safeWarn("更新清单无效", error);
      return { status: "invalid-manifest" };
    }
    if (!isUpdateAvailable(currentVersion, manifest)) {
      return { status: "up-to-date", version: manifest.version };
    }

    let downloadResult;
    try {
      downloadResult = await deps.download(manifest.wgt_url, () => {});
      if (!downloadResult || !downloadResult.tempFilePath) {
        throw new Error("没有得到 WGT 临时文件");
      }
    } catch (error) {
      safeWarn("下载 WGT 失败", error);
      return { status: "download-failed", version: manifest.version };
    }

    const localPath = downloadResult.tempFilePath;
    const removeFile = async () => {
      if (typeof deps.removeFile === "function") {
        try {
          await deps.removeFile(localPath);
        } catch (error) {
          safeWarn("清理临时 WGT 失败", error);
        }
      }
    };

    if (manifest.size_bytes !== undefined) {
      if (typeof deps.getFileSize !== "function") {
        await removeFile();
        return { status: "size-check-failed", version: manifest.version };
      }
      try {
        const actualSize = await deps.getFileSize(localPath);
        if (Number(actualSize) !== manifest.size_bytes) {
          await removeFile();
          return { status: "size-mismatch", version: manifest.version };
        }
      } catch (error) {
        await removeFile();
        safeWarn("读取 WGT 文件大小失败", error);
        return { status: "size-check-failed", version: manifest.version };
      }
    }

    try {
      await deps.install(localPath);
    } catch (error) {
      await removeFile();
      safeWarn("安装 WGT 失败", error);
      return { status: "install-failed", version: manifest.version };
    }
    await removeFile();

    try {
      if (typeof deps.restart === "function") {
        deps.restart();
      }
    } catch (error) {
      safeWarn("重启 App 失败", error);
    }
    return { status: "installed", version: manifest.version };
  }

  return {
    check() {
      if (inFlight) {
        return inFlight;
      }
      inFlight = runCheck()
        .catch((error) => {
          safeWarn("自动更新失败", error);
          return { status: "failed" };
        })
        .finally(() => {
          inFlight = null;
        });
      return inFlight;
    }
  };
}

function resolvePlusRuntime() {
  return typeof plus !== "undefined" ? plus : null;
}

function requestWithUni(url) {
  return new Promise((resolve, reject) => {
    if (typeof uni === "undefined" || typeof uni.request !== "function") {
      reject(new Error("uni.request 不可用"));
      return;
    }
    const separator = url.includes("?") ? "&" : "?";
    uni.request({
      url: `${url}${separator}_t=${Date.now()}`,
      success: (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`更新清单请求失败: ${res.statusCode}`));
          return;
        }
        const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
        resolve(data);
      },
      fail: reject
    });
  });
}

function downloadWithUni(url, onProgress) {
  return new Promise((resolve, reject) => {
    if (typeof uni === "undefined" || typeof uni.downloadFile !== "function") {
      reject(new Error("uni.downloadFile 不可用"));
      return;
    }
    const task = uni.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode !== 200 || !res.tempFilePath) {
          reject(new Error(`WGT 下载失败: ${res.statusCode}`));
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
}

function getFileSizeWithUni(filePath) {
  return new Promise((resolve, reject) => {
    if (typeof uni === "undefined" || typeof uni.getFileInfo !== "function") {
      reject(new Error("uni.getFileInfo 不可用"));
      return;
    }
    uni.getFileInfo({
      filePath,
      success: (res) => resolve(Number(res.size)),
      fail: reject
    });
  });
}

function removeFileWithPlus(filePath) {
  return new Promise((resolve) => {
    const runtime = resolvePlusRuntime();
    if (
      !runtime ||
      !runtime.io ||
      typeof runtime.io.resolveLocalFileSystemURL !== "function"
    ) {
      resolve();
      return;
    }
    runtime.io.resolveLocalFileSystemURL(
      filePath,
      (entry) => {
        if (!entry || typeof entry.remove !== "function") {
          resolve();
          return;
        }
        entry.remove(resolve, resolve);
      },
      resolve
    );
  });
}

function getCurrentVersionWithPlus() {
  return new Promise((resolve, reject) => {
    const runtime = resolvePlusRuntime();
    if (
      !runtime ||
      !runtime.runtime ||
      typeof runtime.runtime.getProperty !== "function"
    ) {
      resolve("");
      return;
    }
    runtime.runtime.getProperty(
      runtime.runtime.appid,
      (info) => resolve(info && info.version ? String(info.version) : ""),
      reject
    );
  });
}

function installWithPlus(filePath) {
  return new Promise((resolve, reject) => {
    const runtime = resolvePlusRuntime();
    if (!runtime || !runtime.runtime || typeof runtime.runtime.install !== "function") {
      reject(new Error("plus.runtime.install 不可用"));
      return;
    }
    runtime.runtime.install(filePath, { force: false }, resolve, reject);
  });
}

/**
 * AI:创建使用 uni-app 与 App-Plus 原生能力的更新服务。
 * @param {{getCurrentPages?: function(): Array}} options AI:可选运行时适配。
 * @returns {{check: function(): Promise<Object>}} AI:App 更新服务。
 */
export function createAppUpdateService(options = {}) {
  const getPages =
    typeof options.getCurrentPages === "function"
      ? options.getCurrentPages
      : () => (typeof getCurrentPages === "function" ? getCurrentPages() : []);
  return createUpdateService({
    getCurrentVersion: getCurrentVersionWithPlus,
    requestManifest: () => requestWithUni(updateManifestUrl),
    download: downloadWithUni,
    getFileSize: getFileSizeWithUni,
    removeFile: removeFileWithPlus,
    install: installWithPlus,
    restart: () => {
      const runtime = resolvePlusRuntime();
      if (!runtime || !runtime.runtime || typeof runtime.runtime.restart !== "function") {
        throw new Error("plus.runtime.restart 不可用");
      }
      runtime.runtime.restart();
    },
    isPlaybackActive: () => {
      const pages = getPages();
      const currentPage = Array.isArray(pages) ? pages[pages.length - 1] : null;
      const route = currentPage && (currentPage.route || (currentPage.$page && currentPage.$page.route));
      return route === "pages/player/index";
    },
    now: () => Date.now(),
    getLastCheckAt: () => {
      if (typeof uni === "undefined" || typeof uni.getStorageSync !== "function") {
        return 0;
      }
      return uni.getStorageSync("app_update_last_check_at");
    },
    setLastCheckAt: (value) => {
      if (typeof uni !== "undefined" && typeof uni.setStorageSync === "function") {
        uni.setStorageSync("app_update_last_check_at", value);
      }
    }
  });
}
