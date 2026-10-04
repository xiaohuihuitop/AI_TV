/**
 * AI:校验 public index 清单是否符合客户端约定。
 * @param {Object|string} raw AI:服务端返回的原始清单。
 * @returns {{valid: boolean, data?: Object, message?: string}} AI:校验结果。
 */
export function validateIndexManifest(raw) {
  let data = raw;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (error) {
      return { valid: false, message: "服务器返回的数据格式不正确" };
    }
  }
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    !Array.isArray(data.items) ||
    !data.items.every((item) => isValidIndexItem(item))
  ) {
    return { valid: false, message: "服务器返回的数据格式不正确" };
  }
  return { valid: true, data };
}

function isValidIndexItem(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return false;
  }
  const isPrimitive = (value) =>
    typeof value === "string" || typeof value === "number";
  if (!isPrimitive(item.id) || typeof item.title !== "string" || typeof item.url !== "string") {
    return false;
  }
  const id = item.id === undefined || item.id === null ? "" : String(item.id).trim();
  const type = String(item.type || "").trim();
  const title = item.title.trim();
  const url = item.url.trim();
  if (!id || !title || !/^https?:\/\//i.test(url)) {
    return false;
  }
  return type === "video" || type === "article";
}

/**
 * AI:读取仅属于当前清单地址的缓存，避免切换服务器后串用旧内容。
 * @param {Object|string|null} cachedData AI:缓存信封。
 * @param {string} sourceUrl AI:当前请求的标准化清单地址。
 * @returns {{valid: boolean, data?: Object}} AI:缓存匹配结果。
 */
export function resolveCachedManifest(cachedData, sourceUrl) {
  if (!cachedData || typeof cachedData !== "object" || Array.isArray(cachedData)) {
    return { valid: false };
  }
  const expectedSource = String(sourceUrl || "").trim();
  const cachedSource = String(cachedData.sourceUrl || "").trim();
  if (!expectedSource || cachedSource !== expectedSource) {
    return { valid: false };
  }
  const manifest = validateIndexManifest(cachedData.data);
  return manifest.valid ? { valid: true, data: manifest.data } : { valid: false };
}

/**
 * AI:将清单 HTTP 响应转为客户端可展示的加载结果。
 * @param {{statusCode?: number, data?: Object|string|null, cachedData?: Object|string|null, sourceUrl?: string}} input AI:响应、缓存和当前清单地址。
 * @returns {{kind: string, data?: Object, notice?: string, message?: string}} AI:加载结果。
 */
export function resolveIndexLoadState({
  statusCode = 0,
  data = null,
  cachedData = null,
  sourceUrl = ""
} = {}) {
  if (Number(statusCode) === 200) {
    const manifest = validateIndexManifest(data);
    return manifest.valid
      ? { kind: "fresh", data: manifest.data }
      : { kind: "error", message: manifest.message };
  }
  if (Number(statusCode) === 401 || Number(statusCode) === 403) {
    return { kind: "error", message: "服务器认证失败，请检查地址和账号密码" };
  }
  const cached = resolveCachedManifest(cachedData, sourceUrl);
  if (cached.valid) {
    return {
      kind: "cache",
      data: cached.data,
      notice: "无法连接服务器，当前显示缓存内容"
    };
  }
  return {
    kind: "error",
    message: "无法连接服务器，请检查服务是否启动或地址是否正确"
  };
}

/**
 * AI:根据加载状态选择唯一的页面主体视图。
 * @param {{loading?: boolean, error?: string, itemCount?: number}} input AI:页面状态。
 * @returns {"loading"|"error"|"empty"|"content"} AI:视图状态。
 */
export function deriveFeedViewState({ loading = false, error = "", itemCount = 0 } = {}) {
  if (Number(itemCount) > 0) {
    return "content";
  }
  if (error) {
    return "error";
  }
  if (loading) {
    return "loading";
  }
  return "empty";
}
