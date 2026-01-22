const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const offlinePath = path.join(root, "frontend", "pages", "offline", "index.vue");

function fail(message) {
  console.error(message);
  process.exit(1);
}

const text = fs.readFileSync(offlinePath, "utf-8");

if (!/onShow\s*\(\)\s*\{[^}]*refreshDownloads\s*\(/s.test(text)) {
  fail("离线页 onShow 需触发 refreshDownloads");
}

if (!/startProgressWatcher\s*\(/.test(text)) {
  fail("离线页需包含 startProgressWatcher");
}

if (!/setInterval\s*\(/.test(text)) {
  fail("离线页需使用定时刷新进度");
}

if (!/(onHide|onUnload)\s*\(\)\s*\{[^}]*stopProgressWatcher\s*\(/s.test(text)) {
  fail("离线页需在 onHide/onUnload 停止刷新");
}

if (!/clearInterval\s*\(/.test(text)) {
  fail("离线页需清理定时器");
}

console.log("ok");