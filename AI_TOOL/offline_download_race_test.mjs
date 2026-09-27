import { createOfflineService } from "../android/utils/offlineService.js";

function createMemoryStorage() {
  const store = {};
  let writeCount = 0;
  return {
    get: (key) => store[key],
    set: (key, value) => {
      store[key] = value;
      writeCount += 1;
    },
    remove: (key) => {
      delete store[key];
    },
    getWriteCount: () => writeCount
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

  const burstStorage = createMemoryStorage();
  let progressCallbackCount = 0;
  const burstDownloader = {
    async download(_url, onProgress) {
      for (let value = 0; value <= 100; value += 1) {
        onProgress(value);
      }
      return { tempFilePath: "/tmp/burst.mp4" };
    },
    async save() {
      return { savedFilePath: "/saved/burst.mp4" };
    }
  };
  await createOfflineService(burstStorage, burstDownloader).addDownload(
    {
      id: "burst",
      url: "http://example.com/burst.mp4",
      type: "video",
      title: "Burst"
    },
    () => {
      progressCallbackCount += 1;
    }
  );
  if (burstStorage.getWriteCount() > 30) {
    console.error("FAIL: progress persistence was not throttled", burstStorage.getWriteCount());
    process.exitCode = 1;
    return;
  }
  if (progressCallbackCount > 25) {
    console.error("FAIL: progress UI callbacks were not throttled", progressCallbackCount);
    process.exitCode = 1;
    return;
  }
  console.log("PASS");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});