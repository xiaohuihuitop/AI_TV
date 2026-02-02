/**
 * AI:读取文本内容，支持本地与远端地址。
 * @param {string} src AI:文本地址。
 * @param {{read?: function(string): Promise<string>}} adapter AI:本地读取适配器。
 * @returns {Promise<string>} AI:读取到的文本。
 */
export async function readTextContent(src, adapter) {
  if (!src) {
    return "";
  }
  const isRemote = /^https?:\/\//i.test(src);
  if (!isRemote && adapter && typeof adapter.read === "function") {
    return adapter.read(src);
  }
  if (!isRemote && typeof uni !== "undefined" && typeof uni.getFileSystemManager === "function") {
    return readLocalText(src);
  }
  return requestText(src);
}

/**
 * AI:读取本地文本文件内容。
 * @param {string} filePath AI:本地文件路径。
 * @returns {Promise<string>} AI:本地文本内容。
 */
function readLocalText(filePath) {
  return new Promise((resolve, reject) => {
    const manager = uni.getFileSystemManager();
    manager.readFile({
      filePath: normalizeLocalPath(filePath),
      encoding: "utf8",
      success: (res) => resolve(res.data),
      fail: (error) => reject(error)
    });
  });
}

/**
 * AI:通过网络请求获取文本内容。
 * @param {string} url AI:远端地址。
 * @returns {Promise<string>} AI:远端文本内容。
 */
function requestText(url) {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      success: (res) => {
        if (res.statusCode === 200) {
          const data = res.data;
          resolve(typeof data === "string" ? data : JSON.stringify(data));
          return;
        }
        reject(new Error(`读取失败: ${res.statusCode}`));
      },
      fail: (error) => reject(error)
    });
  });
}

/**
 * AI:规范化本地文件路径。
 * @param {string} filePath AI:原始路径。
 * @returns {string} AI:处理后的路径。
 */
function normalizeLocalPath(filePath) {
  return String(filePath || "").replace(/^file:\/\//, "");
}
