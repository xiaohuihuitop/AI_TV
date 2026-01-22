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
    pass: /<video[^>]*object-fit=["']contain["']/.test(content)
  },
  {
    name: "未自动请求全屏",
    pass:
      !/@play\s*=\s*["']handlePlay["']/.test(content) &&
      !/@fullscreenchange\s*=\s*["']handleFullscreenChange["']/.test(content) &&
      !/requestFullScreen\s*\(/.test(content)
  },
  {
    name: "播放窗口高度加大",
    pass: /\.video-player\s*\{[^}]*height:\s*320px;[^}]*\}/s.test(content)
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
