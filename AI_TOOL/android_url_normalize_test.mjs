import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const configSource = readFileSync("android/utils/appConfig.js", "utf8");
const match = configSource.match(/export function normalizeRequestUrl[\s\S]*?\n}/);
assert.ok(match, "normalizeRequestUrl not found");

const normalizeRequestUrl = new Function(
  `${match[0].replace("export function normalizeRequestUrl", "function normalizeRequestUrl")}
  return normalizeRequestUrl;`
)();

assert.equal(
  normalizeRequestUrl("qh.xhhtop.top:8000/public/index.json?user=admin&pass=admin"),
  "http://qh.xhhtop.top:8000/public/index.json?user=admin&pass=admin"
);
assert.equal(normalizeRequestUrl("http://qh.xhhtop.top:8000/a"), "http://qh.xhhtop.top:8000/a");
assert.equal(normalizeRequestUrl("https://example.com/a"), "https://example.com/a");
assert.equal(normalizeRequestUrl(""), "");

console.log("android url normalize ok");
