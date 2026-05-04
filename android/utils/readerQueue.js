/**
 * AI:读取缓存的图文阅读队列。
 * @param {{get: function(string): (string|undefined)}} storage AI:存储适配器。
 * @returns {{list: Array, index: number}} AI:阅读队列与当前位置。
 */
export function loadReaderQueue(storage) {
  const list = parseList(storage.get("reader_queue"));
  const index = parseIndex(storage.get("reader_queue_index"));
  return { list, index };
}

/**
 * AI:保存图文阅读队列。
 * @param {{set: function(string, string): void}} storage AI:存储适配器。
 * @param {Array} list AI:阅读队列。
 * @param {number} index AI:当前位置。
 * @returns {void} AI:无返回值。
 */
export function saveReaderQueue(storage, list, index) {
  const safeList = Array.isArray(list) ? list : [];
  storage.set("reader_queue", JSON.stringify(safeList));
  storage.set("reader_queue_index", String(normalizeIndex(index)));
}

/**
 * AI:更新图文阅读队列位置。
 * @param {{set: function(string, string): void}} storage AI:存储适配器。
 * @param {number} index AI:当前位置。
 * @returns {void} AI:无返回值。
 */
export function updateReaderIndex(storage, index) {
  storage.set("reader_queue_index", String(normalizeIndex(index)));
}

function parseList(value) {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function parseIndex(value) {
  const index = Number(value);
  return Number.isFinite(index) ? index : -1;
}

function normalizeIndex(index) {
  const value = Number(index);
  return Number.isFinite(value) ? value : -1;
}
