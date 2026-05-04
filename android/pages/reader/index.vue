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
    <view v-else class="content card" :class="{ 'content-reading': !useWebview }">
      <web-view v-if="useWebview && webviewSrc" class="content-webview" :src="webviewSrc"></web-view>
      <mp-html
        v-else-if="content"
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
      useWebview: false,
      webviewSrc: "",
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
    if (!source) {
      this.error = "缺少阅读地址";
      return;
    }
    if (!isRemoteSource(source)) {
      this.error = "不支持本地文件阅读";
      return;
    }
    const resolvedFormat = resolveContentFormat(format || origin || source);
    this.isMarkdown = resolvedFormat !== "html";
    this.useWebview = resolvedFormat === "html";
    this.webviewSrc = "";
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
      if (this.useWebview) {
        this.content = "";
        this.contentDomain = "";
        this.webviewSrc = this.source;
        this.loading = false;
        return;
      }
      this.contentDomain = this.computeContentDomain();
      readTextContent(this.source)
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
 * AI:判断是否为远端地址。
 * @param {string} source AI:内容来源。
 * @returns {boolean} AI:是否为远端地址。
 */
function isRemoteSource(source) {
  return /^https?:\/\//i.test(String(source || ""));
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

.content-reading {
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(31, 27, 22, 0.08);
  box-shadow: var(--shadow-float);
  padding: 22px 20px;
}

.content-html {
  font-size: 15px;
  line-height: 1.85;
  color: var(--color-text);
  font-family: var(--font-display);
}

.content-webview {
  width: 100%;
  height: 70vh;
  min-height: 60vh;
}

.content-html :deep(h1),
.content-html :deep(h2),
.content-html :deep(h3),
.content-html :deep(h4) {
  margin: 24px 0 10px;
  font-family: var(--font-body);
  line-height: 1.35;
  color: var(--color-text);
}

.content-html :deep(h1) {
  font-size: 24px;
  letter-spacing: 0.02em;
}

.content-html :deep(h2) {
  font-size: 20px;
}

.content-html :deep(h3) {
  font-size: 17px;
}

.content-html :deep(h4) {
  font-size: 15px;
}

.content-html :deep(.md-p),
.content-html :deep(p) {
  margin: 12px 0;
}

.content-html :deep(.md-blockquote) {
  margin: 18px 0;
  padding: 12px 16px;
  border-left: 4px solid rgba(217, 108, 47, 0.4);
  background: rgba(217, 108, 47, 0.06);
  border-radius: 12px;
  color: var(--color-muted);
}

.content-html :deep(code),
.content-html :deep(.md-code) {
  padding: 2px 6px;
  border-radius: 6px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  background: rgba(31, 27, 22, 0.08);
}

.content-html :deep(pre),
.content-html :deep(.md-pre) {
  margin: 16px 0;
  padding: 14px;
  border-radius: 14px;
  background: #f1eae2;
  overflow: auto;
  font-size: 0.92em;
}

.content-html :deep(pre code),
.content-html :deep(.md-pre .md-code) {
  background: none;
  padding: 0;
}

.content-html :deep(hr) {
  border: none;
  height: 1px;
  background: rgba(31, 27, 22, 0.08);
  margin: 22px 0;
}

.content-html :deep(ul),
.content-html :deep(ol) {
  padding-left: 20px;
}

.content-html :deep(table),
.content-html :deep(.md-table) {
  margin: 18px 0;
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  font-size: 0.95em;
}

.content-html :deep(th),
.content-html :deep(td),
.content-html :deep(.md-th),
.content-html :deep(.md-td) {
  padding: 8px 12px;
  border: 1px solid rgba(31, 27, 22, 0.1);
  text-align: left;
}

.content-html :deep(a) {
  color: #b45309;
  text-decoration: none;
  border-bottom: 1px solid rgba(180, 83, 9, 0.3);
}

.content-html :deep(a:hover) {
  border-bottom-color: rgba(180, 83, 9, 0.7);
}

.content-html :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 16px 0;
  border-radius: 12px;
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
