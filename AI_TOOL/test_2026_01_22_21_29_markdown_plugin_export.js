const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pluginPath = path.join(root, "frontend", "uni_modules", "mp-html", "plugins", "markdown", "index.js");

function fail(message) {
  console.error(message);
  process.exit(1);
}

const text = fs.readFileSync(pluginPath, "utf-8");

if (!/export\s+default\s+Markdown/.test(text)) {
  fail("markdown 插件需导出 default 以支持 ESModule 引入");
}

if (!/import\s+\{\s*marked\s*\}\s+from\s+['\"]\.\/marked\.min\.js['\"]/.test(text)) {
  fail("markdown 插件需使用 ESM import 引入 marked.min.js");
}

if (/module\.exports/.test(text)) {
  fail("markdown 插件不应使用 module.exports");
}

if (/require\s*\(/.test(text)) {
  fail("markdown 插件不应使用 require");
}

console.log("ok");