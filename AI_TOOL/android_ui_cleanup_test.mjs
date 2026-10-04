import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { formatIndexUrlForDisplay, validateIndexUrl } from "../android/utils/appConfig.js";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

assert.equal(
  formatIndexUrlForDisplay("https://example.com/public/index.json?user=admin&pass=secret&x=1"),
  "https://example.com/public/index.json?user=***&pass=***&x=1"
);
assert.equal(
  formatIndexUrlForDisplay("https://example.com/public/index.json?u%73er=admin&p%61ss=secret&x=1"),
  "https://example.com/public/index.json?u%73er=***&p%61ss=***&x=1"
);
assert.equal(
  formatIndexUrlForDisplay("https://admin:secret@example.com/public/index.json"),
  "https://***:***@example.com/public/index.json"
);
assert.deepEqual(validateIndexUrl("tv.xiaohuihuitop.top/public/index.json?user=admin&pass=admin"), {
  valid: true,
  value: "http://tv.xiaohuihuitop.top/public/index.json?user=admin&pass=admin"
});
assert.deepEqual(validateIndexUrl("ftp://example.com/index.json"), {
  valid: false,
  message: "请输入有效的 http 或 https 清单地址"
});
assert.deepEqual(validateIndexUrl("http://admin:secret@example.com/index.json"), {
  valid: false,
  message: "服务器地址不能包含账号密码"
});
for (const malformed of [
  "http://:8000/index.json",
  "http://example.com:bad/index.json",
  "http://exa mple.com/index.json",
  "http://[::1/public/index.json"
]) {
  assert.deepEqual(validateIndexUrl(malformed), {
    valid: false,
    message: "请输入有效的 http 或 https 清单地址"
  });
}
assert.deepEqual(validateIndexUrl("https://example.com/not-index"), {
  valid: false,
  message: "地址必须指向 index.json"
});

const [app, latest, offline, settings, tabBar, mediaCard, emptyState, player, reader] =
  await Promise.all([
    read("android/App.vue"),
    read("android/pages/latest/index.vue"),
    read("android/pages/offline/index.vue"),
    read("android/pages/settings/index.vue"),
    read("android/components/AppTabBar.vue"),
    read("android/components/MediaListCard.vue"),
    read("android/components/EmptyState.vue"),
    read("android/pages/player/index.vue"),
    read("android/pages/reader/index.vue")
  ]);

assert.match(app, /--control-height:?\s*48px/);
assert.match(app, /--shadow-card:\s*0 8px 20px/);
assert.match(app, /\.btn\s*\{[\s\S]*?min-height:\s*var\(--control-height\)/);
assert.match(tabBar, /min-height:\s*48px/);
assert.match(tabBar, /height:\s*calc\(76px/);
assert.match(mediaCard, /emits:\s*\[\s*["']click["'],\s*["']cover-error["']\s*\]/);
assert.match(mediaCard, /class="media-card"/);
assert.match(mediaCard, /media-card-cover/);
assert.match(mediaCard, /media-card-action/);
assert.match(mediaCard, /item\.description/);
assert.match(mediaCard, /media-card-description/);
assert.match(emptyState, /class="empty-state"/);
assert.match(emptyState, /title/);
assert.match(emptyState, /description/);
assert.match(latest, /<media-list-card/);
assert.match(offline, /<media-list-card/);
assert.match(latest, /feedViewState/);
assert.match(latest, /<empty-state/);
assert.match(settings, /formatIndexUrlForDisplay/);
assert.match(settings, /validateIndexUrl/);
assert.match(settings, /@confirm="confirmAddressDialog"/);
assert.match(settings, /onBackPress\(\)[\s\S]*?this\.showAddressModal[\s\S]*?this\.closeAddressDialog\(\)[\s\S]*?return true/s);
assert.match(settings, /padding-bottom:\s*calc\(16px \+ env\(safe-area-inset-bottom\)\)/);
assert.match(settings, /max-height:\s*calc\(100vh/);
assert.match(settings, /overflow-y:\s*auto/);
assert.match(settings, /visibleIndexUrl/);
assert.doesNotMatch(settings, /保存并刷新/);
assert.match(app, /--duration-fast:\s*\d+ms/);
assert.match(latest, /\.download\s*\{[\s\S]*?min-height:\s*var\(--control-height\)/);
assert.match(offline, /\.remove\s*\{[\s\S]*?min-height:\s*var\(--control-height\)/);
assert.doesNotMatch(latest, /\brole=|aria-/);
assert.doesNotMatch(app, /prefers-reduced-motion/);
for (const page of [latest, offline, settings, player, reader]) {
  assert.doesNotMatch(page, /size="mini"/);
}
assert.match(app, /\.btn\s*\{[\s\S]*?text-align:\s*center/);
assert.doesNotMatch(settings, /class="header hero"/);

console.log("android ui cleanup tests passed");
