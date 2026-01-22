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
        :markdown="true"
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
    this.source = source;
    this.title = title;
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
        .catch(() => {
          this.error = "内容加载失败";
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
      const source = String(this.source || "");
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
        if (!manager || typeof manager.readFile !== "function") {
          reject(new Error("当前环境不支持本地读取"));
          return;
        }
        manager.readFile({
          filePath: normalizeLocalPath(filePath),
          encoding: "utf8",
          success: (res) => resolve(res.data),
          fail: (error) => reject(error)
        });
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
