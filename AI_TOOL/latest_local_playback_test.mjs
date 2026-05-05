import assert from "node:assert/strict";
import {
  applyLocalDownload,
  normalizeIndexItems
} from "../android/utils/indexService.js";
import { buildDownloadStatusMap } from "../android/utils/offlineService.js";

const remoteUrl = "http://qh.xhhtop.top:8000/public/files/video.mp4";
const localPath = "_doc/uniapp_save/video-local.mp4";
const localCover = "_doc/uniapp_save/video-cover.jpg";

const normalized = normalizeIndexItems({
  items: [
    {
      id: "video-1",
      type: "video",
      title: "已下载视频",
      url: remoteUrl,
      cover: "http://qh.xhhtop.top:8000/public/files/video.jpg",
      published_at: "2026-05-05T10:00:00"
    }
  ]
});

const statusMap = buildDownloadStatusMap([
  {
    id: "video-1",
    type: "video",
    status: "done",
    progress: 100,
    local_path: localPath,
    cover_local_path: localCover
  }
]);

const items = applyLocalDownload(normalized.items, statusMap);

assert.equal(items.length, 1);
assert.equal(items[0].url, remoteUrl);
assert.equal(items[0].local_path, localPath);
assert.equal(items[0].cover, localCover);

console.log("PASS");
