const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const files = [
  path.join(root, "frontend", "pages", "latest", "index.vue"),
  path.join(root, "frontend", "pages", "offline", "index.vue")
];

for (const file of files) {
  const text = fs.readFileSync(file, "utf-8");
  if (!text.includes("item-card")) throw new Error(`缺少 item-card: ${file}`);
  if (!text.includes("btn")) throw new Error(`缺少 btn 基类: ${file}`);
  if (!text.includes("--delay")) throw new Error(`缺少渐入延迟: ${file}`);
}

console.log("ok");
