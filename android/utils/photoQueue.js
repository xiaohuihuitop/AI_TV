/**
 * AI:读取本地缓存的相册查看数据。
 * @param {{get: function(string): (string|undefined)}} storage AI:存储读取适配器。
 * @returns {{album: Object|null, index: number}} AI:相册对象与起始索引。
 */
export function loadPhotoAlbum(storage) {
  const album = parseAlbum(storage.get("photo_album"));
  const index = parseIndex(storage.get("photo_album_index"));
  return { album, index };
}

/**
 * AI:保存相册查看数据，供查看页读取。
 * @param {{get: function(string): (string|undefined), set: function(string, string): void}} storage AI:存储读写适配器。
 * @param {Object} album AI:相册清单条目（含 photos 数组）。
 * @param {number} index AI:起始照片索引。
 * @returns {boolean} AI:是否保存成功。
 */
export function savePhotoAlbum(storage, album, index) {
  const photos = album && Array.isArray(album.photos) ? album.photos : [];
  if (!album || photos.length === 0) {
    return false;
  }
  storage.set("photo_album", JSON.stringify(album));
  storage.set("photo_album_index", String(normalizeIndex(index, photos.length)));
  return true;
}

/**
 * AI:仅更新相册查看页当前索引，避免滑动时重复写入整个相册对象。
 * @param {{get: function(string): (string|undefined), set: function(string, string): void}} storage AI:存储读写适配器。
 * @param {number} index AI:当前照片索引。
 * @returns {boolean} AI:是否更新成功。
 */
export function updatePhotoIndex(storage, index) {
  const album = parseAlbum(storage.get("photo_album"));
  const photos = album && Array.isArray(album.photos) ? album.photos : [];
  if (photos.length === 0) {
    return false;
  }
  storage.set("photo_album_index", String(normalizeIndex(index, photos.length)));
  return true;
}

function parseAlbum(value) {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    if (!parsed || !Array.isArray(parsed.photos) || parsed.photos.length === 0) {
      return null;
    }
    return parsed;
  } catch (error) {
    return null;
  }
}

function parseIndex(value) {
  const index = Number(value);
  return Number.isFinite(index) && index >= 0 ? index : 0;
}

function normalizeIndex(index, total) {
  const value = Number(index);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.min(value, total - 1);
}
