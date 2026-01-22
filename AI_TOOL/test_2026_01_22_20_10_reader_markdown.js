const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const readerPath = path.join(root, "frontend", "pages", "reader", "index.vue");

function fail(message) {
  console.error(message);
  process.exit(1);
}

const text = fs.readFileSync(readerPath, "utf-8");

if (!/mp-html/.test(text)) {
  fail("阅读页需引入 mp-html 组件");
}

if (!/<mp-html[\s\S]*:content=/.test(text)) {
  fail("阅读页需使用 mp-html 渲染 content");
}

if (!/markdown\s*=\s*"true"/.test(text)) {
  fail("阅读页需启用 markdown 渲染");
}

if (!/contentDomain/.test(text)) {
  fail("阅读页需设置 contentDomain");
}

console.log("ok");