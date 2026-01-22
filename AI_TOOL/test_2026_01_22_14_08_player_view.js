const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "frontend", "pages", "player", "index.vue");
const text = fs.readFileSync(file, "utf-8");

if (!text.includes("<video")) throw new Error("播放页缺少 video 组件");
if (!text.includes("src")) throw new Error("播放页缺少 src 绑定");

console.log("ok");
