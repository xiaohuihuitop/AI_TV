/**
 * AI:读取本地缓存的播放队列和当前索引。
 * @param {{get: function(string): (string|undefined), set: function(string, string): void}} storage AI:存储读写适配器。
 * @returns {{list: Array, index: number}} AI:播放队列与索引。
 */
export function loadPlayerQueue(storage) {
  const list = parseList(storage.get("player_queue"));
  const index = parseIndex(storage.get("player_queue_index"));
  return { list, index };
}

/**
 * AI:保存播放队列与当前索引。
 * @param {{get: function(string): (string|undefined), set: function(string, string): void}} storage AI:存储读写适配器。
 * @param {Array} list AI:播放队列。
 * @param {number} index AI:当前索引。
 * @returns {void} AI:无返回值。
 */
export function savePlayerQueue(storage, list, index) {
  const safeList = Array.isArray(list) ? list : [];
  storage.set("player_queue", JSON.stringify(safeList));
  storage.set("player_queue_index", String(normalizeIndex(index)));
}

/**
 * AI:仅更新播放队列当前索引。
 * @param {{get: function(string): (string|undefined), set: function(string, string): void}} storage AI:存储读写适配器。
 * @param {number} index AI:当前索引。
 * @returns {void} AI:无返回值。
 */
export function updatePlayerIndex(storage, index) {
  storage.set("player_queue_index", String(normalizeIndex(index)));
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
