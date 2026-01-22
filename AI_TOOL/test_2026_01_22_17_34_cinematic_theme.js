const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const scss = fs.readFileSync(path.join(root, "frontend", "uni.scss"), "utf-8");
const requiredTokens = [
  "--color-bg",
  "--color-surface",
  "--color-text",
  "--color-accent",
  "--font-display",
  "--font-body"
];

requiredTokens.forEach((token) => {
  if (!scss.includes(token)) throw new Error(`缺少主题变量: ${token}`);
});

if (!scss.includes("linear-gradient")) throw new Error("缺少背景渐变");

const pages = JSON.parse(fs.readFileSync(path.join(root, "frontend", "pages.json"), "utf-8"));
if (pages.globalStyle.navigationBarTextStyle !== "black") {
  throw new Error("导航栏文字需为黑色");
}
if (pages.globalStyle.navigationBarBackgroundColor !== "#f7f2ea") {
  throw new Error("导航栏背景需为 #f7f2ea");
}
if (pages.globalStyle.backgroundColor !== "#f7f2ea") {
  throw new Error("页面背景需为 #f7f2ea");
}

console.log("ok");
