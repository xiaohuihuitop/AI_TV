/**
 * AI:规范化清单数据并按发布时间倒序。
 * @param {Object} raw AI:原始清单对象。
 * @returns {{items: Array}} AI:排序后的清单对象。
 */
function normalizeIndexItems(raw) {
  const items = Array.isArray(raw && raw.items) ? raw.items.slice() : [];
  items.sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || "")));
  return { items };
}

/**
 * AI:创建本地存储适配器，统一 JSON 读写。
 * @param {{get: function(string): (string|undefined), set: function(string, string): void, remove: function(string): void}} storage AI:底层存储读写函数。
 * @returns {{getJson: function(string): Object|null, setJson: function(string, Object): void, remove: function(string): void}} AI:适配器实例。
 */
function createStorageAdapter(storage) {
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

module.exports = { normalizeIndexItems, createStorageAdapter };
