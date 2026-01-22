const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pages = [
  path.join(root, "frontend", "pages", "latest", "index.vue"),
  path.join(root, "frontend", "pages", "offline", "index.vue")
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

for (const file of pages) {
  const text = fs.readFileSync(file, "utf-8");
  if (!text.includes("media-tabs")) fail(`缺少顶部切换: ${file}`);
  if (!text.includes("activeType")) fail(`缺少 activeType: ${file}`);
}

console.log("ok");
