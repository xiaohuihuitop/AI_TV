const fs = require("fs");
const path = require("path");

const files = [
  path.join(__dirname, "..", "frontend", "pages", "player", "index.vue"),
  path.join(__dirname, "..", "frontend", "pages", "reader", "index.vue")
];

for (const file of files) {
  const text = fs.readFileSync(file, "utf-8");
  if (!text.includes("btn")) throw new Error(`缺少 btn 基类: ${file}`);
  if (!text.includes("hero")) throw new Error(`缺少 hero 样式: ${file}`);
}

console.log("ok");
