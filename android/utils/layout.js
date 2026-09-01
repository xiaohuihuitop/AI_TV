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

/**
 * Resolve the HTML5+ orientation lock used by the immersive player page.
 * @param {number} width Video width in pixels.
 * @param {number} height Video height in pixels.
 * @returns {"landscape-primary"|"portrait-primary"} Screen orientation lock.
 */
export function getVideoOrientationLock(width, height) {
  return Number(width) > Number(height)
    ? "landscape-primary"
    : "portrait-primary";
}

/**
 * Reserve the action bar and bottom safe area from the immersive video region.
 * @param {number} windowHeight Available window height in CSS pixels.
 * @param {number} actionHeight Action bar height in CSS pixels.
 * @param {number} safeBottom Bottom safe-area inset in CSS pixels.
 * @returns {number} Video region height in CSS pixels.
 */
export function calculateImmersiveVideoHeight(windowHeight, actionHeight, safeBottom) {
  const height = Math.max(0, Number(windowHeight) || 0);
  const reserved =
    Math.max(0, Number(actionHeight) || 0) + Math.max(0, Number(safeBottom) || 0);
  return Math.max(0, Math.round(height - reserved));
}

/**
 * Check whether rotation has produced a stable viewport before hiding system UI.
 * @param {number} width Current viewport width.
 * @param {number} height Current viewport height.
 * @param {string} orientation Target HTML5+ orientation lock.
 * @returns {boolean} Whether immersive chrome can be hidden safely.
 */
export function isViewportReadyForOrientation(width, height, orientation) {
  const safeWidth = Math.max(0, Number(width || 0));
  const safeHeight = Math.max(0, Number(height || 0));
  if (!isViewportStable(safeWidth, safeHeight)) {
    return false;
  }
  if (orientation === "landscape-primary") {
    return safeWidth > safeHeight;
  }
  if (orientation === "portrait-primary") {
    return safeHeight >= safeWidth;
  }
  return false;
}

/**
 * Reject transient App-Plus viewport sizes produced while system UI is changing.
 * @param {number} width Current viewport width.
 * @param {number} height Current viewport height.
 * @returns {boolean} Whether the viewport is large enough for rotation.
 */
export function isViewportStable(width, height) {
  const safeWidth = Math.max(0, Number(width || 0));
  const safeHeight = Math.max(0, Number(height || 0));
  return Math.min(safeWidth, safeHeight) >= 160;
}

function normalizeDimension(value, fallback) {
  const dimension = Number(value);
  return Number.isFinite(dimension) && dimension > 0 ? dimension : fallback;
}
