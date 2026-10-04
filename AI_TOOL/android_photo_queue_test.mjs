import assert from "node:assert/strict";
import { loadPhotoAlbum, savePhotoAlbum, updatePhotoIndex } from "../android/utils/photoQueue.js";

function createStorage(initial = {}) {
  const values = { ...initial };
  return {
    get(key) {
      return values[key];
    },
    set(key, value) {
      values[key] = value;
    },
    values
  };
}

const album = {
  id: 7,
  title: "家庭相册测试",
  photos: [{ url: "one" }, { url: "two" }, { url: "three" }]
};

const storage = createStorage();
assert.equal(savePhotoAlbum(storage, album, 0), true);
assert.deepEqual(loadPhotoAlbum(storage), { album, index: 0 });
assert.equal(updatePhotoIndex(storage, 1), true);
assert.equal(loadPhotoAlbum(storage).index, 1);
assert.equal(updatePhotoIndex(storage, 99), true);
assert.equal(loadPhotoAlbum(storage).index, 2);
assert.equal(updatePhotoIndex(storage, -1), true);
assert.equal(loadPhotoAlbum(storage).index, 0);

const invalidStorage = createStorage({ photo_album: JSON.stringify({ title: "empty", photos: [] }) });
assert.equal(updatePhotoIndex(invalidStorage, 1), false);
assert.equal(invalidStorage.values.photo_album_index, undefined);
assert.equal(savePhotoAlbum(invalidStorage, null, 0), false);

console.log("android photo queue tests passed");
