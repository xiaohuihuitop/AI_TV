const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const targets = [
  path.join(root, "frontend", "pages", "latest", "index.vue"),
  path.join(root, "frontend", "pages", "offline", "index.vue"),
  path.join(root, "frontend", "pages", "settings", "index.vue")
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

for (const file of targets) {
  const text = fs.readFileSync(file, "utf-8");
  if (text.includes("require(")) {
    fail(`页面包含 require: ${file}`);
  }
}

console.log("ok");
