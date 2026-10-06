export const updateManifestUrl =
  "https://tv.xhhtop.top/update/update.json";

export const defaultIndexUrl =
  "https://tv.xhhtop.top/public/index.json?user=admin&pass=admin";

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

/**
 * AI:校验用户输入的清单地址并返回标准化结果。
 * @param {string} value AI:用户输入地址。
 * @returns {{valid: boolean, value?: string, message?: string}} AI:校验结果。
 */
export function validateIndexUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return { valid: false, message: "地址不能为空" };
  }
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(raw) && !/^https?:\/\//i.test(raw)) {
    return { valid: false, message: "请输入有效的 http 或 https 清单地址" };
  }
  const normalized = normalizeRequestUrl(raw);
  const match = normalized.match(/^(https?):\/\/([^/?#]+)(\/[^?#]*)?(?:\?[^#]*)?(?:#.*)?$/i);
  if (!match) {
    return { valid: false, message: "请输入有效的 http 或 https 清单地址" };
  }
  const [, protocol, authority, path = "/"] = match;
  if (authority.includes("@")) {
    return { valid: false, message: "服务器地址不能包含账号密码" };
  }
  if (!protocol || !isValidAuthority(authority)) {
    return { valid: false, message: "请输入有效的 http 或 https 清单地址" };
  }
  if (!/\/index\.json$/i.test(path)) {
    return { valid: false, message: "地址必须指向 index.json" };
  }
  return { valid: true, value: normalized };
}

/**
 * AI:掩码显示清单地址中的账户和密码参数。
 * @param {string} value AI:原始清单地址。
 * @returns {string} AI:用于界面展示的地址。
 */
export function formatIndexUrlForDisplay(value) {
  const normalized = normalizeRequestUrl(value);
  if (!normalized) {
    return "";
  }
  const maskedUserInfo = normalized.replace(
    /^(https?:\/\/)[^/?#@]*:[^/?#@]*@/i,
    "$1***:***@"
  );
  const queryStart = maskedUserInfo.indexOf("?");
  if (queryStart < 0) {
    return maskedUserInfo;
  }
  const hashStart = maskedUserInfo.indexOf("#", queryStart);
  const queryEnd = hashStart >= 0 ? hashStart : maskedUserInfo.length;
  const prefix = maskedUserInfo.slice(0, queryStart + 1);
  const query = maskedUserInfo.slice(queryStart + 1, queryEnd);
  const suffix = maskedUserInfo.slice(queryEnd);
  const maskedQuery = query
    .split("&")
    .map((part) => maskCredentialParameter(part))
    .join("&");
  return `${prefix}${maskedQuery}${suffix}`;
}

function isValidAuthority(authority) {
  const value = String(authority || "");
  if (!value || /\s/.test(value)) {
    return false;
  }
  if (value.startsWith("[")) {
    return /^\[[0-9a-f:.]+\](?::\d{1,5})?$/i.test(value);
  }
  const match = value.match(/^([^:]+)(?::(\d{1,5}))?$/);
  if (!match) {
    return false;
  }
  const [, host, port] = match;
  if (!host || !/^(?:localhost|[a-z\d](?:[a-z\d.-]*[a-z\d])?)$/i.test(host)) {
    return false;
  }
  return !port || Number(port) <= 65535;
}

function maskCredentialParameter(part) {
  const separator = part.indexOf("=");
  if (separator < 0) {
    return part;
  }
  const rawName = part.slice(0, separator);
  let decodedName = rawName;
  try {
    decodedName = decodeURIComponent(rawName.replace(/\+/g, "%20"));
  } catch (error) {
    decodedName = rawName;
  }
  if (!/^(?:user|pass)$/i.test(decodedName)) {
    return part;
  }
  return `${rawName}=***`;
}
