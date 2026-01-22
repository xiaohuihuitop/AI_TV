const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pagesPath = path.join(root, "frontend", "pages.json");
const pages = JSON.parse(fs.readFileSync(pagesPath, "utf-8")).pages || [];
const paths = pages.map((item) => item.path);

if (!paths.includes("pages/player/index")) throw new Error("缺少 player 页面");
if (!paths.includes("pages/reader/index")) throw new Error("缺少 reader 页面");

console.log("ok");
