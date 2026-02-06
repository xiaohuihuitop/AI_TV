/**
 * AI:规范化清单数据并按发布时间倒序。
 * @param {Object} raw AI:原始清单对象。
 * @returns {{items: Array}} AI:排序后的清单对象。
 */
export function normalizeIndexItems(raw) {
  const items = Array.isArray(raw && raw.items) ? raw.items.slice() : [];
  const normalized = items.map((item) => ({
    ...item,
    cover: resolveCoverUrl(item)
  }));
  normalized.sort((a, b) =>
    String(b.published_at || "").localeCompare(String(a.published_at || ""))
  );
  return { items: normalized };
}

/**
 * AI:解析条目封面地址，优先读取显式字段，再尝试由内容地址推导。
 * @param {Object} item AI:条目信息。
 * @returns {string} AI:封面地址，可能为空字符串。
 */
export function resolveCoverUrl(item) {
  if (!item) {
    return "";
  }
  const localCover =
    typeof item.cover_local_path === "string" ? item.cover_local_path.trim() : "";
  if (localCover) {
    return localCover;
  }
  const cover =
    typeof item.cover === "string"
      ? item.cover.trim()
      : typeof item.cover_url === "string"
        ? item.cover_url.trim()
        : "";
  if (cover) {
    return cover;
  }
  const url = typeof item.url === "string" ? item.url.trim() : "";
  return deriveCoverUrl(url);
}

/**
 * AI:根据资源地址推导封面地址，默认替换为 .jpg 后缀。
 * @param {string} url AI:资源地址。
 * @returns {string} AI:推导后的封面地址，可能为空字符串。
 */
function deriveCoverUrl(url) {
  if (!url) {
    return "";
  }
  const cleaned = url.split("#")[0].split("?")[0];
  const lastSlash = cleaned.lastIndexOf("/");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastDot <= lastSlash) {
    return "";
  }
  return `${cleaned.slice(0, lastDot)}.jpg`;
}

/**
 * AI:创建本地存储适配器，统一 JSON 读写。
 * @param {{get: function(string): (string|undefined), set: function(string, string): void, remove: function(string): void}} storage AI:底层存储读写函数。
 * @returns {{getJson: function(string): Object|null, setJson: function(string, Object): void, remove: function(string): void}} AI:适配器实例。
 */
export function createStorageAdapter(storage) {
  return {
    getJson(key) {
      const value = storage.get(key);
      return value ? JSON.parse(value) : null;
    },
    setJson(key, value) {
      storage.set(key, JSON.stringify(value));
    },
    remove(key) {
      storage.remove(key);
    }
  };
}

