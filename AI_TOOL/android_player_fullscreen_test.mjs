import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

const layoutSource = await read("android/utils/layout.js");
assert.match(layoutSource, /export function getVideoFullscreenDirection/);

const layout = await import("../android/utils/layout.js");
const { getVideoFullscreenDirection } = layout;
assert.equal(getVideoFullscreenDirection(1920, 1080), 90);
assert.equal(getVideoFullscreenDirection(1080, 1920), 0);
assert.equal(getVideoFullscreenDirection(1080, 1080), 0);
assert.equal(getVideoFullscreenDirection(0, 1080), 0);
assert.equal(typeof layout.getVideoOrientationLock, "function");
assert.equal(typeof layout.calculateImmersiveVideoHeight, "function");
assert.equal(typeof layout.isViewportReadyForOrientation, "function");
assert.equal(layout.getVideoOrientationLock(1920, 1080), "landscape-primary");
assert.equal(layout.getVideoOrientationLock(1080, 1920), "portrait-primary");
assert.equal(layout.getVideoOrientationLock(1080, 1080), "portrait-primary");
assert.equal(layout.getVideoOrientationLock(0, 1080), "portrait-primary");
assert.equal(layout.calculateImmersiveVideoHeight(360, 72, 0), 288);
assert.equal(layout.calculateImmersiveVideoHeight(640, 72, 24), 544);
assert.equal(layout.calculateImmersiveVideoHeight(-1, -1, -1), 0);
assert.equal(layout.isViewportReadyForOrientation(640, 360, "landscape-primary"), true);
assert.equal(layout.isViewportReadyForOrientation(640, 80, "landscape-primary"), false);
assert.equal(layout.isViewportReadyForOrientation(360, 640, "portrait-primary"), true);
assert.equal(layout.isViewportReadyForOrientation(0, 0, "portrait-primary"), false);

const player = await read("android/pages/player/index.vue");
assert.match(player, /object-fit="contain"/);
assert.match(player, /:show-fullscreen-btn="false"/);
assert.match(player, /@loadedmetadata="handleLoadedMetadata"/);
assert.match(player, /class="immersive-actions"/);
assert.doesNotMatch(player, /requestFullScreen/);
assert.doesNotMatch(player, /@fullscreenchange=/);
assert.match(player, /uni\.getImageInfo\(\{/);
assert.match(player, /createImmersivePlayerController/);
assert.match(player, /pendingOrientationLock/);
assert.match(player, /immersiveController\.enter\(this\.pendingOrientationLock\)/);
assert.match(player, /immersiveController\.finishEnter\(viewportReady, orientationReady\)/);
assert.match(player, /isViewportReadyForOrientation/);
assert.match(player, /handlePlay\(\)\s*\{[\s\S]*?this\.tryEnterImmersiveMode\(\)/);
assert.match(player, /onUnload\(\)\s*\{[\s\S]*?this\.exitImmersiveMode\(\)/);
assert.match(player, /goBack\(\)\s*\{[\s\S]*?this\.exitImmersiveMode\(\)/);
assert.match(
  player,
  /\.player-page\.is-immersive\s*\{[\s\S]*?max-width:\s*none;[\s\S]*?margin:\s*0;/
);

const pages = JSON.parse(await read("android/pages.json"));
const playerPage = pages.pages.find((page) => page.path === "pages/player/index");
assert.equal(playerPage.style.navigationStyle, "custom");

const latest = await read("android/pages/latest/index.vue");
const offline = await read("android/pages/offline/index.vue");
for (const source of [latest, offline]) {
  assert.match(source, /restoreStandardSystemUi/);
  assert.match(source, /onShow\(\)\s*\{[\s\S]*?restoreStandardSystemUi\(resolvePlusRuntime\)/);
}

console.log("android player fullscreen tests passed");
