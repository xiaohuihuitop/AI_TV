import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatAppVersion, readAppVersion } from "../android/utils/appVersion.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

assert.equal(formatAppVersion({ version: "1.0.2", versionCode: "102" }), "1.0.2（102）");
assert.equal(formatAppVersion({ version: "1.0.2", versionCode: "" }), "1.0.2");
assert.equal(formatAppVersion({ version: "", versionCode: "102" }), "102");
assert.equal(formatAppVersion({ version: "", versionCode: "" }), "未知");
assert.equal(formatAppVersion(null), "未知");

const missingRuntime = await readAppVersion();
assert.deepEqual(missingRuntime, { version: "", versionCode: "" });

const settingsPage = readFileSync(join(root, "android", "pages", "settings", "index.vue"), "utf-8");
assert.ok(settingsPage.includes("当前版本"), "设置页必须显示当前版本");
assert.ok(settingsPage.includes("readAppVersion"), "设置页必须使用与更新服务同源的版本读取");
assert.ok(settingsPage.includes("formatAppVersion"), "设置页必须复用统一格式化");

const manifest = readFileSync(join(root, "android", "manifest.json"), "utf-8");
assert.ok(manifest.includes('"versionName" : "1.0.2"'), "manifest 版本名应为 1.0.2");
assert.ok(manifest.includes('"versionCode" : "102"'), "manifest 版本号应为 102");

console.log("android version display tests ok");
