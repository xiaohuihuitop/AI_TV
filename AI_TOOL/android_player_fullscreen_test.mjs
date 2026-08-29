import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

const layoutSource = await read("android/utils/layout.js");
assert.match(layoutSource, /export function getVideoFullscreenDirection/);

const { getVideoFullscreenDirection } = await import("../android/utils/layout.js");
assert.equal(getVideoFullscreenDirection(1920, 1080), 90);
assert.equal(getVideoFullscreenDirection(1080, 1920), 0);
assert.equal(getVideoFullscreenDirection(1080, 1080), 0);
assert.equal(getVideoFullscreenDirection(0, 1080), 0);

const player = await read("android/pages/player/index.vue");
assert.match(player, /object-fit="contain"/);
assert.match(player, /:show-fullscreen-btn="true"/);
assert.match(player, /@loadedmetadata="handleLoadedMetadata"/);
assert.match(player, /@fullscreenchange="handleFullscreenChange"/);
assert.match(player, /requestFullScreen\(\{ direction \}\)/);
assert.match(player, /uni\.getImageInfo\(\{/);
assert.match(player, /pendingFullscreenDirection/);
assert.match(player, /handlePlay\(\)\s*\{[\s\S]*?this\.tryEnterFullscreen\(\)/);

console.log("android player fullscreen tests passed");
