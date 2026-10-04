import assert from "node:assert/strict";
import {
  buildDownloadIdentity,
  buildDownloadStatusMap,
  createOfflineService,
  removeDownloadFiles
} from "../android/utils/offlineService.js";
import { applyLocalDownload } from "../android/utils/indexService.js";

function createMemoryStorage(initial = {}) {
  const store = { ...initial };
  return {
    get: (key) => store[key],
    set: (key, value) => {
      store[key] = value;
    },
    remove: (key) => {
      delete store[key];
    },
    has: (key) => Object.prototype.hasOwnProperty.call(store, key),
    read: (key) => store[key]
  };
}

const serverAItem = {
  id: 1,
  type: "video",
  title: "服务器 A 视频",
  url: "https://server-a.example/public/files/1.mp4?user=admin&pass=admin"
};
const serverBItem = {
  id: 1,
  type: "video",
  title: "服务器 B 视频",
  url: "https://server-b.example/public/files/1.mp4?user=admin&pass=admin"
};
const serverADownload = {
  ...serverAItem,
  status: "done",
  progress: 100,
  local_path: "_doc/server-a-1.mp4",
  cover_local_path: ""
};

assert.equal(
  buildDownloadIdentity(serverAItem),
  '["video","1","https://server-a.example/public/files/1.mp4"]'
);
assert.equal(
  buildDownloadIdentity({
    ...serverAItem,
    url: "https://server-a.example/public/files/1.mp4?u%73er=other&p%61ss=rotated&_t=123"
  }),
  buildDownloadIdentity(serverAItem)
);
assert.notEqual(buildDownloadIdentity(serverAItem), buildDownloadIdentity(serverBItem));

const statusMap = buildDownloadStatusMap([serverADownload]);
assert.equal(statusMap[buildDownloadIdentity(serverAItem)].status, "done");
assert.equal(statusMap[buildDownloadIdentity(serverBItem)], undefined);
assert.equal(applyLocalDownload([serverAItem], statusMap)[0].local_path, "_doc/server-a-1.mp4");
assert.equal(applyLocalDownload([serverBItem], statusMap)[0].local_path, undefined);

const brokenStorage = createMemoryStorage({ download_items: "{broken-json" });
const brokenService = createOfflineService(brokenStorage, {});
assert.deepEqual(brokenService.listDownloads(), []);
assert.equal(brokenStorage.has("download_items"), false);

const wrongShapeStorage = createMemoryStorage({ download_items: JSON.stringify({ id: 1 }) });
const wrongShapeService = createOfflineService(wrongShapeStorage, {});
assert.deepEqual(wrongShapeService.listDownloads(), []);
assert.equal(wrongShapeStorage.has("download_items"), false);

const staleStorage = createMemoryStorage({
  download_items: JSON.stringify([
    {
      ...serverAItem,
      status: "downloading",
      progress: 45,
      download_token: "stale-task"
    }
  ])
});
const staleService = createOfflineService(staleStorage, {});
const staleList = staleService.listDownloads();
assert.equal(staleList[0].status, "failed");
assert.equal(staleList[0].progress, 0);
assert.equal(staleList[0].last_error, "下载已中断，请重新下载");

const activeStorage = createMemoryStorage();
const pendingDownloader = {
  download: () => new Promise(() => {}),
  save: async () => ({ savedFilePath: "_doc/pending.mp4" })
};
const activeService = createOfflineService(activeStorage, pendingDownloader);
activeService.addDownload(serverAItem).catch(() => {});
assert.equal(activeService.listDownloads()[0].status, "downloading");
await assert.rejects(
  activeService.removeDownload(serverAItem),
  /下载进行中，暂时不能删除/
);
assert.equal(activeService.listDownloads().length, 1);

const removedPaths = [];
const partialItem = {
  ...serverADownload,
  local_path: "_doc/video.mp4",
  cover_local_path: "_doc/cover.jpg"
};
let deletionError = null;
try {
  await removeDownloadFiles(partialItem, async (path) => {
    removedPaths.push(path);
    if (path.endsWith("video.mp4")) {
      throw new Error("video delete failed");
    }
  });
} catch (error) {
  deletionError = error;
}
assert.equal(deletionError && deletionError.message, "video delete failed");
assert.deepEqual(deletionError && deletionError.removedFields, ["cover_local_path"]);
assert.deepEqual(removedPaths, ["_doc/cover.jpg", "_doc/video.mp4"]);

const partialStorage = createMemoryStorage({
  download_items: JSON.stringify([partialItem])
});
const partialService = createOfflineService(partialStorage, {});
partialService.clearDownloadPaths(partialItem, deletionError.removedFields);
const partiallyRemoved = partialService.listDownloads()[0];
assert.equal(partiallyRemoved.cover_local_path, "");
assert.equal(partiallyRemoved.local_path, "_doc/video.mp4");

console.log("android offline integrity tests passed");
