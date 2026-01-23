const fs = require("fs");
const path = require("path");

const targetPath = path.join(
  __dirname,
  "..",
  "frontend",
  "pages",
  "player",
  "index.vue"
);
const content = fs.readFileSync(targetPath, "utf8");

const checks = [
  {
    name: "禁止全屏按钮",
    pass: /<video[^>]*:show-fullscreen-btn=["']false["']/.test(content)
  },
  {
    name: "横向显示适配",
    pass:
      /<video[^>]*:object-fit=/.test(content) ||
      /<video[^>]*object-fit=["'](contain|cover)["']/.test(content)
  },
  {
    name: "不锁定横屏",
    pass:
      !/setScreenOrientation\s*\(/.test(content) &&
      !/lockOrientation\s*\(\s*["']landscape-primary["']\s*\)/.test(content)
  },
  {
    name: "不强制恢复竖屏",
    pass:
      !/setScreenOrientation\s*\(\s*\{\s*orientation\s*:\s*["']portrait["']\s*\}\s*\)/.test(
        content
      ) &&
      !/lockOrientation\s*\(\s*["']portrait-primary["']\s*\)/.test(content)
  },
  {
    name: "未自动请求全屏",
    pass: !/requestFullScreen\s*\(/.test(content)
  },
  {
    name: "播放窗口使用像素高度",
    pass: /videoHeight/.test(content) && /getSystemInfoSync/.test(content)
  },
  {
    name: "播放按钮可见",
    pass: /show-center-play-btn/.test(content) && /show-play-btn/.test(content)
  },
  {
    name: "样式绑定高度",
    pass: /:style=/.test(content) && /videoHeight/.test(content)
  }
];

const failed = checks.filter((item) => !item.pass);

if (failed.length > 0) {
  console.error("视频横屏播放配置不符合要求：");
  failed.forEach((item) => {
    console.error(`- ${item.name}`);
  });
  process.exit(1);
}

console.log("视频横屏播放配置通过。");
