const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pages = [
  path.join(root, "frontend", "pages", "latest", "index.vue"),
  path.join(root, "frontend", "pages", "offline", "index.vue")
];

for (const file of pages) {
  const text = fs.readFileSync(file, "utf-8");
  if (!text.includes("openVideo")) throw new Error(`缺少 openVideo: ${file}`);
  if (!text.includes("openArticle")) throw new Error(`缺少 openArticle: ${file}`);
  if (!text.includes("navigateTo")) throw new Error(`缺少 navigateTo: ${file}`);
}

console.log("ok");
