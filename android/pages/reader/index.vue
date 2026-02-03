<template>
  <view class="app-page">
    <view class="header hero">
      <text class="title">{{ title || "图文" }}</text>
      <text class="subtitle muted">阅读内容</text>
    </view>
    <view v-if="loading" class="loading muted">加载中...</view>
    <view v-else-if="error" class="error-card card">
      <text class="error-text">{{ error }}</text>
    </view>
    <view v-else class="content card">
      <mp-html
        v-if="content"
        class="content-html"
        :content="content"
        :markdown="isMarkdown"
        :selectable="true"
        :preview-img="true"
        :domain="contentDomain"
      ></mp-html>
      <view v-else class="placeholder muted">暂无内容</view>
    </view>
    <view class="actions">
      <button class="btn btn-ghost back" size="mini" @click="goBack">返回</button>
    </view>
  </view>
</template>

<script>
import { readTextContent } from "../../utils/fileService.js";
import MpHtml from "../../uni_modules/mp-html/components/mp-html/mp-html.vue";

export default {
  components: {
    MpHtml
  },
  data() {
    return {
      source: "",
      title: "",
      content: "",
      origin: "",
      isMarkdown: true,
      contentDomain: "",
      loading: false,
      error: ""
    };
  },
  /**
   * AI:读取路由参数并加载内容。
   * @param {{src?: string, title?: string}} query AI:路由参数。
   * @returns {void} AI:无返回值。
   */
  onLoad(query) {
    const source = query && query.src ? decodeURIComponent(query.src) : "";
    const title = query && query.title ? decodeURIComponent(query.title) : "";
    const origin = query && query.origin ? decodeURIComponent(query.origin) : "";
    const format = query && query.format ? decodeURIComponent(query.format) : "";
    this.source = source;
    this.title = title;
    this.origin = origin;
    this.isMarkdown = resolveContentFormat(format || origin || source) !== "html";
    if (!source) {
      this.error = "缺少阅读地址";
      return;
    }
    this.loadContent();
  },
  methods: {
    /**
     * AI:加载图文文本内容。
     * @returns {void} AI:无返回值。
     */
    loadContent() {
      this.loading = true;
      this.error = "";
      this.contentDomain = this.computeContentDomain();
      readTextContent(this.source, createUniFileAdapter())
        .then((text) => {
          this.content = text || "";
        })
        .catch((error) => {
          const message = error && (error.errMsg || error.message) ? error.errMsg || error.message : "";
          this.error = message ? `内容加载失败: ${message}` : "内容加载失败";
        })
        .finally(() => {
          this.loading = false;
        });
    },
    /**
     * AI:返回上一页。
     * @returns {void} AI:无返回值。
     */
    goBack() {
      uni.navigateBack();
    },
    /**
     * AI:计算 Markdown 相对资源的基础域名。
     * @returns {string} AI:基础域名或空字符串。
     */
    computeContentDomain() {
      const source = String(this.origin || this.source || "");
      if (!/^https?:\/\//i.test(source)) {
        return "";
      }
      const match = source.match(/^(https?:\/\/[^/]+)(\/.*)?$/i);
      if (!match) {
        return "";
      }
      const origin = match[1];
      const pathname = match[2] || "/";
      const basePath = pathname.replace(/\/[^/]*$/, "/");
      return `${origin}${basePath}`;
    }
  }
};

/**
 * AI:创建本地文件读取适配器。
 * @returns {{read: function(string): Promise<string>}} AI:文件读取适配器。
 */
function createUniFileAdapter() {
  return {
    read(filePath) {
      return new Promise((resolve, reject) => {
        const manager =
          typeof uni !== "undefined" && typeof uni.getFileSystemManager === "function"
            ? uni.getFileSystemManager()
            : null;
        const candidates = buildFilePathCandidates(filePath);
        const tryPlusRead = (index) => {
          const plusCandidates = buildPlusCandidates(candidates);
          if (index >= plusCandidates.length) {
            reject(new Error(`本地文件读取失败: ${plusCandidates.join(" | ")}`));
            return;
          }
          const path = plusCandidates[index];
          if (typeof plus === "undefined" || !plus.io || !plus.io.resolveLocalFileSystemURL) {
            reject(new Error("当前环境不支持本地读取"));
            return;
          }
          let settled = false;
          const timer = setTimeout(() => {
            if (!settled) {
              tryPlusRead(index + 1);
            }
          }, 3000);
          const finalize = (fn) => {
            if (settled) {
              return;
            }
            settled = true;
            clearTimeout(timer);
            fn();
          };
          plus.io.resolveLocalFileSystemURL(
            path,
            (entry) => {
              entry.file(
                (file) => {
                  const reader = new FileReader();
                  reader.onload = () => finalize(() => resolve(reader.result || ""));
                  reader.onerror = () => finalize(() => tryPlusRead(index + 1));
                  reader.readAsText(file, "utf-8");
                },
                () => finalize(() => tryPlusRead(index + 1))
              );
            },
            () => finalize(() => tryPlusRead(index + 1))
          );
        };
        const tryRead = (index) => {
          if (index >= candidates.length) {
            reject(new Error(`本地文件读取失败: ${candidates.join(" | ")}`));
            return;
          }
          manager.readFile({
            filePath: candidates[index],
            encoding: "utf8",
            success: (res) => resolve(res.data),
            fail: () => tryRead(index + 1)
          });
        };
        if (manager && typeof manager.readFile === "function") {
          tryRead(0);
          return;
        }
        tryPlusRead(0);
      });
    }
  };
}

/**
 * AI:规范化本地文件路径。
 * @param {string} filePath AI:原始路径。
 * @returns {string} AI:处理后的路径。
 */
function normalizeLocalPath(filePath) {
  return String(filePath || "").replace(/^file:\/\//, "");
}

/**
 * AI:生成可读取的本地路径候选列表。
 * @param {string} filePath AI:原始路径。
 * @returns {string[]} AI:候选路径列表。
 */
function buildFilePathCandidates(filePath) {
  const raw = String(filePath || "");
  const normalized = normalizeLocalPath(raw);
  const decoded = safeDecode(raw);
  const decodedNormalized = normalizeLocalPath(decoded);
  const mapped = mapLegacyDocPaths([raw, normalized, decoded, decodedNormalized]);
  const candidates = [raw, normalized, decoded, decodedNormalized, ...mapped].filter(Boolean);
  return Array.from(new Set(candidates));
}

/**
 * AI:生成 plus 读取候选路径。
 * @param {string[]} candidates AI:基础候选。
 * @returns {string[]} AI:plus 候选。
 */
function buildPlusCandidates(candidates) {
  const list = Array.isArray(candidates) ? candidates.slice() : [];
  const expanded = [];
  list.forEach((item) => {
    expanded.push(item);
    if (!item.startsWith("file://")) {
      expanded.push(`file://${item}`);
    }
    if (typeof plus !== "undefined" && plus.io && typeof plus.io.convertLocalFileSystemURL === "function") {
      const converted = plus.io.convertLocalFileSystemURL(item);
      expanded.push(converted);
      if (converted && !converted.startsWith("file://")) {
        expanded.push(`file://${converted}`);
      }
    }
  });
  return Array.from(new Set(expanded.filter(Boolean)));
}

/**
 * AI:兼容 _doc/ 路径映射到沙箱绝对路径。
 * @param {string[]} values AI:原始候选路径。
 * @returns {string[]} AI:映射后的候选路径。
 */
function mapLegacyDocPaths(values) {
  const base = typeof plus !== "undefined" && plus.io ? plus.io.convertLocalFileSystemURL("_doc/") : "";
  if (!base) {
    return [];
  }
  const prefix = "file://";
  const basePath = base.startsWith(prefix) ? base.slice(prefix.length) : base;
  return values
    .map((value) => String(value || ""))
    .filter(Boolean)
    .filter((value) => value.startsWith("_doc/"))
    .map((value) => value.replace("_doc/", basePath));
}

/**
 * AI:安全解码路径。
 * @param {string} value AI:原始路径。
 * @returns {string} AI:解码后路径。
 */
function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return String(value || "");
  }
}

/**
 * AI:根据格式标识或地址推断内容格式。
 * @param {string} input AI:格式或地址。
 * @returns {string} AI:html 或 markdown。
 */
function resolveContentFormat(input) {
  const lower = String(input || "").toLowerCase();
  if (lower === "html") {
    return "html";
  }
  if (lower === "markdown" || lower === "md") {
    return "markdown";
  }
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    return "html";
  }
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
    return "markdown";
  }
  return "markdown";
}
</script>

<style scoped>
.header {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  animation: rise-fade 320ms ease-out both;
}

.title {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 0.02em;
  font-family: var(--font-display);
}

.subtitle {
  display: block;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.loading {
  margin-top: 12px;
  font-size: 12px;
}

.content {
  margin-top: 12px;
  background: rgba(255, 255, 255, 0.95);
}

.content-html {
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text);
}

.content-html :deep(h1),
.content-html :deep(h2),
.content-html :deep(h3),
.content-html :deep(h4) {
  margin: 16px 0 8px;
  font-family: var(--font-display);
  color: var(--color-text);
}

.content-html :deep(.md-p) {
  margin: 10px 0;
}

.content-html :deep(.md-blockquote) {
  margin: 12px 0;
  padding: 8px 12px;
  border-left: 4px solid rgba(217, 108, 47, 0.35);
  background: rgba(217, 108, 47, 0.08);
  border-radius: 10px;
  color: var(--color-muted);
}

.content-html :deep(.md-code) {
  padding: 2px 6px;
  border-radius: 6px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  background: rgba(31, 27, 22, 0.08);
}

.content-html :deep(.md-pre) {
  margin: 12px 0;
  padding: 12px;
  border-radius: 12px;
  background: #f3ede6;
  overflow: auto;
}

.content-html :deep(.md-table) {
  margin: 12px 0;
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
}

.content-html :deep(.md-th),
.content-html :deep(.md-td) {
  padding: 6px 10px;
  border: 1px solid rgba(31, 27, 22, 0.12);
}

.content-html :deep(a) {
  color: #b45309;
}

.content-text {
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.placeholder {
  font-size: 12px;
}

.actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-start;
}

.back {
  min-width: 96px;
}

.error-card {
  margin-top: 12px;
  background: rgba(255, 242, 233, 0.9);
  border: 1px solid rgba(217, 108, 47, 0.25);
}

.error-text {
  color: #b45309;
  font-size: 12px;
}
</style>
