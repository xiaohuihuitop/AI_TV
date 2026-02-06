/**
 * AI:格式化视频时长。
 * @param {number|string} seconds AI:秒数。
 * @returns {string} AI:格式化后的时长文本。
 */
export function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) {
    return "未知";
  }
  const total = Math.floor(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${padTime(hours)}:${padTime(minutes)}:${padTime(secs)}`;
  }
  return `${padTime(minutes)}:${padTime(secs)}`;
}

/**
 * AI:格式化字节大小。
 * @param {number|string} bytes AI:字节数。
 * @returns {string} AI:格式化后的大小。
 */
export function formatSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) {
    return "未知";
  }
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const fixed = size >= 100 || unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
  return `${size.toFixed(fixed)}${units[unitIndex]}`;
}

/**
 * AI:补齐时间显示。
 * @param {number} value AI:数字。
 * @returns {string} AI:补齐后的字符串。
 */
function padTime(value) {
  const num = Math.floor(Number(value));
  return num < 10 ? `0${num}` : String(num);
}
