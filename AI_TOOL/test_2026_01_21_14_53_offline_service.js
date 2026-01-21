const { createOfflineService } = require("../frontend/utils/offlineService.js");

const memory = new Map();
const storage = {
  get: (key) => memory.get(key),
  set: (key, value) => memory.set(key, value),
  remove: (key) => memory.delete(key)
};

const downloader = {
  download: async (url) => ({ tempFilePath: `/tmp/${url.split("/").pop()}` }),
  save: async (tempFilePath) => ({ savedFilePath: tempFilePath.replace("/tmp/", "/saved/") })
};

const service = createOfflineService(storage, downloader);

service
  .addDownload({ id: "v1", title: "demo", url: "http://x/a.mp4" })
  .then(() => {
    const list = service.listDownloads();
    if (list.length !== 1 || !list[0].local_path) {
      throw new Error("离线列表未写入");
    }
    return service.removeDownload("v1");
  })
  .then(() => {
    if (service.listDownloads().length !== 0) {
      throw new Error("离线删除失败");
    }
    console.log("ok");
  })
  .catch((error) => {
    console.error(error.message || String(error));
    process.exit(1);
  });
