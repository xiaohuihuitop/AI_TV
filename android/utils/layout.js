const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 640;
const MIN_VIDEO_HEIGHT = 180;
const PORTRAIT_VIDEO_HEIGHT = 220;
const RESERVED_PAGE_HEIGHT = 120;

/**
 * Calculate a 16:9 player height without hiding the page actions.
 * @param {number} width Available page width.
 * @param {number} height Available page height.
 * @returns {number} Player height in CSS pixels.
 */
export function calculateVideoHeight(width, height) {
  const safeWidth = normalizeDimension(width, DEFAULT_WIDTH);
  const safeHeight = normalizeDimension(height, DEFAULT_HEIGHT);
  const aspectHeight = Math.round((safeWidth * 9) / 16);
  const preferredHeight = Math.max(PORTRAIT_VIDEO_HEIGHT, aspectHeight);
  const availableHeight = Math.max(MIN_VIDEO_HEIGHT, safeHeight - RESERVED_PAGE_HEIGHT);
  return Math.max(MIN_VIDEO_HEIGHT, Math.min(preferredHeight, availableHeight));
}

/**
 * Resolve the native fullscreen orientation from the video's real dimensions.
 * @param {number} width Video width in pixels.
 * @param {number} height Video height in pixels.
 * @returns {0|90} Fullscreen direction used by uni-app VideoContext.
 */
export function getVideoFullscreenDirection(width, height) {
  const safeWidth = Number(width);
  const safeHeight = Number(height);
  return safeWidth > 0 && safeHeight > 0 && safeWidth > safeHeight ? 90 : 0;
}

function normalizeDimension(value, fallback) {
  const dimension = Number(value);
  return Number.isFinite(dimension) && dimension > 0 ? dimension : fallback;
}
