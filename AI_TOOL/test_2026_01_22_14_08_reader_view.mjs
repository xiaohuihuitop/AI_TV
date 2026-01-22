import { readTextContent } from "../frontend/utils/fileService.js";

const memory = new Map([["file://demo.md", "hello"]]);
const adapter = {
  read: async (path) => memory.get(path)
};

const result = await readTextContent("file://demo.md", adapter);
if (result !== "hello") {
  throw new Error("读取本地文本失败");
}

console.log("ok");
