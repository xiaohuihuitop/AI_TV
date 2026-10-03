import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "android", "manifest.json"), "utf-8"));
const modules = manifest?.["app-plus"]?.modules ?? {};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

assert(Object.prototype.hasOwnProperty.call(modules, "VideoPlayer"), "manifest app-plus.modules 必须声明 VideoPlayer，否则云打包 APK 无法播放视频");

const playerSource = readFileSync(join(root, "android", "pages", "player", "index.vue"), "utf-8");
assert(playerSource.includes("<video"), "播放页应使用 video 组件");

console.log("android packaging tests ok");
