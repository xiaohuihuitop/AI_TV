/**
 * AI:读取当前 App 版本信息，与自动更新服务使用同一数据源。
 * @returns {Promise<{version: string, versionCode: string}>} AI:版本名与版本号，读取失败时为空字符串。
 */
export function readAppVersion() {
  return new Promise((resolve) => {
    const runtime = typeof plus !== "undefined" ? plus : null;
    if (
      !runtime ||
      !runtime.runtime ||
      typeof runtime.runtime.getProperty !== "function" ||
      !runtime.runtime.appid
    ) {
      resolve({ version: "", versionCode: "" });
      return;
    }
    runtime.runtime.getProperty(
      runtime.runtime.appid,
      (info) => {
        resolve({
          version: info && info.version ? String(info.version) : "",
          versionCode: info && info.versionCode !== undefined && info.versionCode !== null ? String(info.versionCode) : ""
        });
      },
      () => resolve({ version: "", versionCode: "" })
    );
  });
}

/**
 * AI:格式化版本展示文案。
 * @param {{version?: string, versionCode?: string}|null} info AI:版本信息。
 * @returns {string} AI:形如"1.0.2（102）"的文案，无版本信息时为"未知"。
 */
export function formatAppVersion(info) {
  const version = info && info.version ? String(info.version).trim() : "";
  const code = info && info.versionCode ? String(info.versionCode).trim() : "";
  if (!version && !code) {
    return "未知";
  }
  if (!version) {
    return code;
  }
  return code ? `${version}（${code}）` : version;
}
