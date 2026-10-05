import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const [latest, offline, mediaCard] = await Promise.all([
  read("android/pages/latest/index.vue"),
  read("android/pages/offline/index.vue"),
  read("android/components/MediaListCard.vue")
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
assert.match(latest, /<media-list-card[\s\S]+@cover-error="markCoverRefreshNeeded"/);
assert.match(mediaCard, /<image[^>]+lazy-load[^>]+@error="\$emit\('cover-error'\)"/s);
assert.match(latest, /coverRefreshNeeded:\s*false/);
assert.match(latest, /this\.coverRefreshNeeded\s*=\s*true/);
assert.match(latest, /forceRefresh\s*\|\|\s*this\.coverRefreshNeeded/);
assert.match(offline, /cacheItems/);
assert.match(offline, /item\.status\s*===\s*['"]caching['"]/);
assert.match(offline, /resourceCacheRuntime/);
assert.match(offline, /clearAutoCache/);
assert.match(offline, /(?:service\.remove\(item\)|createCacheService\(\)\.remove\(item\))/);
assert.doesNotMatch(latest, /@click="addDownload\(item\)"/);
assert.match(latest, /startAutomaticCache/);

assert.match(offline, /<media-list-card/);
assert.match(mediaCard, /lazy-load/);

console.log("android performance tests ok");
