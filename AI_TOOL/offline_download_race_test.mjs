import { createOfflineService } from "../android/utils/offlineService.js";

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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMockDownloader(name, progressDelays) {
  return {
    download(url, onProgress) {
      return new Promise((resolve) => {
        progressDelays.forEach((ms, index) => {
          setTimeout(() => {
            if (typeof onProgress === "function") {
              const value = Math.min(100, Math.round(((index + 1) / progressDelays.length) * 100));
              onProgress(value);
            }
            if (index === progressDelays.length - 1) {
              resolve({ tempFilePath: `/tmp/${name}.mp4` });
            }
          }, ms);
        });
      });
    },
    save(tempFilePath) {
      return Promise.resolve({ savedFilePath: tempFilePath.replace("/tmp/", "/saved/") });
    }
  };
}

async function run() {
  const storage = createMemoryStorage();
  const itemA = { id: "a", url: "http://example.com/a.mp4", type: "video", title: "A" };
  const itemB = { id: "b", url: "http://example.com/b.mp4", type: "video", title: "B" };

  const p1 = createOfflineService(storage, createMockDownloader("a", [60, 120])).addDownload(itemA);
  await delay(10);
  const p2 = createOfflineService(storage, createMockDownloader("b", [20, 40])).addDownload(itemB);

  await Promise.all([p1, p2]);

  const raw = storage.get("download_items");
  const list = raw ? JSON.parse(raw) : [];
  console.log("download_items length:", list.length, list.map((entry) => entry.id));
  if (list.length !== 2) {
    console.error("FAIL: expected 2 items but got", list.length);
    process.exitCode = 1;
    return;
  }
  console.log("PASS");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});