const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const settingsPath = path.join(root, "frontend", "pages", "settings", "index.vue");

function fail(message) {
  console.error(message);
  process.exit(1);
}

const text = fs.readFileSync(settingsPath, "utf-8");
const match = text.match(/\.save\s*\{[^}]*\}/s);
if (!match) {
  fail("未找到 .save 样式");
}

if (!/#d96c2f/i.test(match[0])) {
  fail(".save 样式需要固定颜色以避免按钮不可见");
}

console.log("ok");
