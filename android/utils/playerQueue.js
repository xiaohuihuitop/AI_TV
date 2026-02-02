/**
 * AI:?????????????
 * @param {{get: function(string): (string|undefined), set: function(string, string): void}} storage AI:????????
 * @returns {{list: Array, index: number}} AI:????????
 */
export function loadPlayerQueue(storage) {
  const list = parseList(storage.get("player_queue"));
  const index = parseIndex(storage.get("player_queue_index"));
  return { list, index };
}

/**
 * AI:?????????????
 * @param {{get: function(string): (string|undefined), set: function(string, string): void}} storage AI:????????
 * @param {Array} list AI:?????
 * @param {number} index AI:?????
 * @returns {void} AI:?????
 */
export function savePlayerQueue(storage, list, index) {
  const safeList = Array.isArray(list) ? list : [];
  storage.set("player_queue", JSON.stringify(safeList));
  storage.set("player_queue_index", String(normalizeIndex(index)));
}

/**
 * AI:?????????????
 * @param {{get: function(string): (string|undefined), set: function(string, string): void}} storage AI:????????
 * @param {number} index AI:?????
 * @returns {void} AI:?????
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
