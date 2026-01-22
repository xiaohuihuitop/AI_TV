const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "frontend", "pages", "settings", "index.vue");
const text = fs.readFileSync(file, "utf-8");

if (!text.includes("panel")) throw new Error("缺少 panel 样式");
if (!text.includes("btn")) throw new Error("缺少 btn 基类");

console.log("ok");
