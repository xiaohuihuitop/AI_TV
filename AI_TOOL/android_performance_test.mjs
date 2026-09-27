import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const [latest, offline] = await Promise.all([
  read("android/pages/latest/index.vue"),
  read("android/pages/offline/index.vue")
]);

assert.match(latest, /pageVisible:\s*false/);
assert.match(latest, /this\.pageVisible\s*=\s*true/);
assert.match(latest, /this\.pageVisible\s*=\s*false/);
assert.match(latest, /if\s*\(!this\.pageVisible\)\s*\{\s*return;/s);
assert.match(latest, /fetchIndex\(forceRefresh\s*=\s*false\)/);
assert.match(latest, /indexRequestUrl:\s*""/);
assert.match(latest, /indexRequestSequence:\s*0/);
assert.match(latest, /this\.indexRequest\s*&&\s*this\.indexRequestUrl\s*===\s*normalizedUrl/);
assert.match(latest, /requestSequence\s*!==\s*this\.indexRequestSequence/);
assert.match(latest, /applyItems\(data, refreshCovers\s*=\s*false\)/);
assert.match(latest, /refreshCovers\s*\?\s*refreshCoverUrls/);
assert.match(latest, /<image[^>]+lazy-load[^>]+@error="markCoverRefreshNeeded"/s);
assert.match(latest, /coverRefreshNeeded:\s*false/);
assert.match(latest, /this\.coverRefreshNeeded\s*=\s*true/);
assert.match(latest, /forceRefresh\s*\|\|\s*this\.coverRefreshNeeded/);
assert.match(offline, /item\.status\s*===\s*"downloading"/);
assert.match(offline, /Promise\.all\(\[\s*removeLocalFile\(item\.local_path\),\s*removeLocalFile\(item\.cover_local_path\)/s);
assert.match(offline, /<image[^>]+lazy-load/s);

console.log("android performance tests ok");
