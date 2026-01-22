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
      <text v-if="content" class="content-text" selectable>{{ content }}</text>
      <view v-else class="placeholder muted">暂无内容</view>
    </view>
    <view class="actions">
      <button class="btn btn-ghost back" size="mini" @click="goBack">返回</button>
    </view>
  </view>
</template>

<script>
import { readTextContent } from "../../utils/fileService.js";

export default {
  data() {
    return {
      source: "",
      title: "",
      content: "",
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
  background: rgba(15, 18, 28, 0.9);
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
  background: rgba(32, 18, 14, 0.8);
  border: 1px solid rgba(249, 115, 22, 0.3);
}

.error-text {
  color: #f2a56b;
  font-size: 12px;
}
</style>
