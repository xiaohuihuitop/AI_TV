import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateVideoHeight } from "../android/utils/layout.js";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

assert.equal(calculateVideoHeight(360, 640), 220);
assert.equal(calculateVideoHeight(640, 360), 240);
assert.equal(calculateVideoHeight(600, 960), 338);

const app = await read("android/App.vue");
const latest = await read("android/pages/latest/index.vue");
const offline = await read("android/pages/offline/index.vue");
const player = await read("android/pages/player/index.vue");
const settings = await read("android/pages/settings/index.vue");
const tabBar = await read("android/components/AppTabBar.vue");

assert.match(app, /\.app-page\s*\{/);
assert.match(app, /box-sizing:\s*border-box/);
assert.doesNotMatch(app, /overflow-x:\s*hidden/);
assert.match(latest, /grid-template-columns:\s*116px\s+minmax\(0,\s*1fr\)/);
assert.match(latest, /flex-wrap:\s*wrap/);
assert.match(offline, /grid-template-columns:\s*116px\s+minmax\(0,\s*1fr\)/);
assert.match(offline, /flex-wrap:\s*wrap/);
assert.match(player, /calculateVideoHeight/);
assert.doesNotMatch(player, /Math\.max\(baseHeight,\s*maxHeight\)/);
assert.match(settings, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
assert.match(settings, /\.modal-mask\s*\{[\s\S]*?z-index:\s*100/);
assert.match(settings, /<app-tab-bar\s+v-if="!showAddressModal"\s+active="settings"/);
assert.match(tabBar, /max-width:\s*680px/);

console.log("android responsive layout tests passed");
