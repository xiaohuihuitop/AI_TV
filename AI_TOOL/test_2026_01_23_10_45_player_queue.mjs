// AI:??????????
import { loadPlayerQueue, savePlayerQueue, updatePlayerIndex } from "../frontend/utils/playerQueue.js";

const memory = (() => {
  const store = new Map();
  return {
    get: (key) => store.get(key),
    set: (key, value) => store.set(key, value),
    remove: (key) => store.delete(key)
  };
})();

savePlayerQueue(memory, [{ id: "1", url: "u" }], 0);
const result = loadPlayerQueue(memory);
if (!result || result.list.length !== 1 || result.index !== 0) {
  throw new Error("?????????");
}
updatePlayerIndex(memory, 1);
const next = loadPlayerQueue(memory);
if (next.index != 1) {
  throw new Error("??????");
}
console.log("ok");
