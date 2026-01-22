const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pagesPath = path.join(root, "frontend", "pages.json");
const latestPath = path.join(root, "frontend", "pages", "latest", "index.vue");

function fail(message) {
  console.error(message);
  process.exit(1);
}

const pages = JSON.parse(fs.readFileSync(pagesPath, "utf-8"));
const latestPage = (pages.pages || []).find((page) => page.path === "pages/latest/index");
if (!latestPage) fail("未找到最新页面配置");
const latestStyle = latestPage.style || {};
if (latestStyle.enablePullDownRefresh !== true) {
  fail("最新页面需开启 enablePullDownRefresh");
}

const latestText = fs.readFileSync(latestPath, "utf-8");
if (!/onPullDownRefresh\s*\(/.test(latestText)) {
  fail("最新页需实现 onPullDownRefresh");
}
if (!/stopPullDownRefresh/.test(latestText)) {
  fail("最新页需调用 stopPullDownRefresh");
}

console.log("ok");
