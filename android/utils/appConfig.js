export const defaultIndexUrl =
  "qh.xhhtop.top:8000/public/index.json?user=admin&pass=admin";

/**
 * AI:将用户填写的清单地址转换为 App 网络请求可用地址。
 * @param {string} value AI:用户填写或默认的清单地址。
 * @returns {string} AI:带 http/https 协议的请求地址。
 */
export function normalizeRequestUrl(value) {
  const url = String(value || "").trim();
  if (!url) {
    return "";
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `http://${url.replace(/^\/+/, "")}`;
}
