import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatAppVersion, readAppVersion } from "../android/utils/appVersion.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

assert.equal(formatAppVersion({ version: "1.0.6", versionCode: "106" }), "1.0.6（106）");
assert.equal(formatAppVersion({ version: "1.0.6", versionCode: "" }), "1.0.6");
assert.equal(formatAppVersion({ version: "", versionCode: "102" }), "102");
assert.equal(formatAppVersion({ version: "", versionCode: "" }), "未知");
assert.equal(formatAppVersion(null), "未知");

const missingRuntime = await readAppVersion();
assert.deepEqual(missingRuntime, { version: "", versionCode: "" });

const settingsPage = readFileSync(join(root, "android", "pages", "settings", "index.vue"), "utf-8");
assert.ok(settingsPage.includes("当前版本"), "设置页必须显示当前版本");
assert.ok(settingsPage.includes("readAppVersion"), "设置页必须使用与更新服务同源的版本读取");
assert.ok(settingsPage.includes("formatAppVersion"), "设置页必须复用统一格式化");
assert.ok(settingsPage.includes("检查新版本"), "设置页必须提供手动检查入口");
assert.ok(settingsPage.includes("updateProgress"), "设置页必须展示更新进度");
assert.ok(settingsPage.includes("checkForUpdate"), "设置页必须接入共享更新管理器");

const manifest = readFileSync(join(root, "android", "manifest.json"), "utf-8");
assert.ok(manifest.includes('"versionName" : "1.0.6"'), "manifest 版本名应为 1.0.6");
assert.ok(manifest.includes('"versionCode" : "106"'), "manifest 版本号应为 106");

console.log("android version display tests ok");
