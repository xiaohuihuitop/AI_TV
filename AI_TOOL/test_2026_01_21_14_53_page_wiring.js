const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function contains(file, keyword) {
  const text = fs.readFileSync(file, "utf-8");
  return text.includes(keyword);
}

const latest = path.join(root, "frontend", "pages", "latest", "index.vue");
const offline = path.join(root, "frontend", "pages", "offline", "index.vue");
const settings = path.join(root, "frontend", "pages", "settings", "index.vue");

if (!contains(latest, "fetchIndex")) throw new Error("最新页未接入 fetchIndex");
if (!contains(latest, "addDownload")) throw new Error("最新页未接入 addDownload");
if (!contains(offline, "listDownloads")) throw new Error("离线页未接入 listDownloads");
if (!contains(offline, "removeDownload")) throw new Error("离线页未接入 removeDownload");
if (!contains(settings, "index_url")) throw new Error("设置页未接入 index_url");

console.log("ok");
