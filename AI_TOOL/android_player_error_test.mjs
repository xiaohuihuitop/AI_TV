import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const page = readFileSync(join(root, "android", "pages", "player", "index.vue"), "utf-8");

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

assert(page.includes('@error="handleVideoError"'), "播放器 video 组件必须绑定 @error 事件");
assert(page.includes("handleVideoError()"), "缺少 handleVideoError 处理函数");
assert(page.includes("视频播放失败"), "播放失败时必须给用户中文提示");
assert(page.includes("retryCurrent"), "错误卡片必须提供重试入口");

console.log("android player error tests ok");
