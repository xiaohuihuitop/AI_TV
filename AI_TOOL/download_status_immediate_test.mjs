import { createOfflineService, buildDownloadStatusMap } from "../android/utils/offlineService.js";

function createMemoryStorage() {
  const store = {};
  return {
    get: (key) => store[key],
    set: (key, value) => {
      store[key] = value;
    },
    remove: (key) => {
      delete store[key];
    }
  };
}

function createPendingDownloader() {
  return {
    download() {
      return new Promise(() => {});
    },
    save() {
      return Promise.resolve({ savedFilePath: "/saved/video.mp4" });
    }
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const storage = createMemoryStorage();
const service = createOfflineService(storage, createPendingDownloader());
const item = { id: "video-1", url: "http://example.com/video.mp4", type: "video", title: "视频" };

service.addDownload(item).catch(() => {});

const list = service.listDownloads();
const statusMap = buildDownloadStatusMap(list);

assert(list.length === 1, "expected one download item immediately after addDownload");
assert(statusMap["video-1"], "expected status map to contain the downloading item");
assert(statusMap["video-1"].status === "downloading", "expected immediate status to be downloading");

console.log("PASS");
