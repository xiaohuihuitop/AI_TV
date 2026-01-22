import { createOfflineService } from "../frontend/utils/offlineService.js";

const memory = new Map();
const storage = {
  get: (key) => memory.get(key),
  set: (key, value) => memory.set(key, value),
  remove: (key) => memory.delete(key)
};

const downloader = {
  download: async (url, onProgress) => {
    onProgress(30);
    onProgress(100);
    return { tempFilePath: `/tmp/${url.split("/").pop()}` };
  },
  save: async (tempFilePath) => ({ savedFilePath: tempFilePath.replace("/tmp/", "/saved/") })
};

const service = createOfflineService(storage, downloader);
await service.addDownload({ id: "v1", title: "demo", url: "http://x/a.mp4", type: "video" });
const list = service.listDownloads();
if (list[0].progress !== 100 || list[0].status !== "done") {
  throw new Error("进度未更新到完成状态");
}

console.log("ok");
