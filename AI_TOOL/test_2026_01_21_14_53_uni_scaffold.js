const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pagesPath = path.join(root, "frontend", "pages.json");
const requiredPages = [
  "pages/latest/index",
  "pages/offline/index",
  "pages/settings/index"
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(pagesPath)) {
  fail("pages.json 不存在");
}

let pages;
try {
  pages = JSON.parse(fs.readFileSync(pagesPath, "utf-8"));
} catch (error) {
  fail(`pages.json 解析失败: ${error.message}`);
}

const pagePaths = (pages.pages || []).map((item) => item.path);
for (const page of requiredPages) {
  if (!pagePaths.includes(page)) {
    fail(`缺少页面: ${page}`);
  }
}

const tabs = (pages.tabBar && pages.tabBar.list) || [];
if (tabs.length !== 3) {
  fail("tabBar 数量不为 3");
}

console.log("ok");
