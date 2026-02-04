<template>
  <view class="app-page">
    <view class="header hero">
      <text class="title">最新</text>
      <text class="subtitle muted">从清单加载内容</text>
    </view>
    <view class="media-tabs">
      <view
        class="media-tab"
        :class="{ active: activeType === 'video' }"
        @click="setActiveType('video')"
      >
        视频
      </view>
      <view
        class="media-tab"
        :class="{ active: activeType === 'article' }"
        @click="setActiveType('article')"
      >
        图文
      </view>
    </view>
    <view v-if="error" class="error-card card">
      <text class="error-text">{{ error }}</text>
    </view>
    <view class="columns">
      <view class="column card cinematic-card">
        <text class="column-title">{{ activeLabel }}</text>
        <view v-if="activeItems.length === 0" class="placeholder muted">暂无数据</view>
        <view
          v-for="(item, index) in activeItems"
          :key="item.id"
          class="item item-card"
          :style="{ '--delay': `${index * 60}ms` }"
        @click="handleItemClick(item, index)"
        >
          <view class="item-cover">
            <image v-if="item.cover" class="item-cover-image" :src="item.cover" mode="aspectFill" />
          </view>
          <view class="item-main">
            <text class="item-title">{{ item.title }}</text>
            <text v-if="item.type === 'video'" class="item-desc muted">
              {{ item.description || "无" }}
            </text>
            <view v-if="item.type === 'video'" class="item-meta muted">
              <text>时长：{{ formatDuration(item.duration_seconds) }}</text>
              <text>大小：{{ formatSize(item.size_bytes) }}</text>
            </view>
          </view>
          <button
            v-if="item.type === 'video'"
            class="btn btn-primary download"
            size="mini"
            @click.stop="addDownload(item)"
          >
            下载
          </button>
        </view>
      </view>
    </view>
    <view v-if="loading" class="loading muted">加载中...</view>
  </view>
</template>

<script>
import { normalizeIndexItems, createStorageAdapter } from "../../utils/indexService.js";
import { createOfflineService } from "../../utils/offlineService.js";
import { savePlayerQueue } from "../../utils/playerQueue.js";

/**
 * AI:创建 uniapp 存储读写适配器。
 * @returns {{get: function(string): (string|undefined), set: function(string, string): void, remove: function(string): void}} AI:存储读写适配器。
 */
function createUniStorage() {
  return {
    get: (key) => uni.getStorageSync(key),
    set: (key, value) => uni.setStorageSync(key, value),
    remove: (key) => uni.removeStorageSync(key)
  };
}

/**
 * AI:创建下载适配器，封装下载与保存流程。
 * @returns {{download: function(string, function(number): void): Promise<{tempFilePath: string}>, save: function(string): Promise<{savedFilePath: string}>}} AI:下载适配器。
 */
function createUniDownloader() {
  return {
    download(url, onProgress) {
      return new Promise((resolve, reject) => {
        const task = uni.downloadFile({
          url,
          success: (res) => {
            if (res.statusCode === 200) {
              resolve({ tempFilePath: res.tempFilePath });
            } else {
              reject(new Error(`下载失败: ${res.statusCode}`));
            }
          },
          fail: (error) => reject(error)
        });
        if (task && typeof task.onProgressUpdate === "function") {
          task.onProgressUpdate((res) => {
            if (typeof onProgress === "function") {
              onProgress(res.progress);
            }
          });
        }
      });
    },
    save(tempFilePath) {
      return new Promise((resolve, reject) => {
        uni.saveFile({
          tempFilePath,
          success: (res) => resolve({ savedFilePath: res.savedFilePath }),
          fail: (error) => reject(error)
        });
      });
    },
    /**
     * AI:保存文件到指定路径。
     * @param {string} tempFilePath AI:临时路径。
     * @param {string} filePath AI:目标路径。
     * @returns {Promise<{savedFilePath: string}>} AI:保存结果。
     */
    saveWithPath(tempFilePath, filePath) {
      return new Promise((resolve, reject) => {
        uni.saveFile({
          tempFilePath,
          filePath,
          success: (res) => resolve({ savedFilePath: res.savedFilePath || filePath }),
          fail: (error) => reject(error)
        });
      });
    }
  };
}

const indexUrlKey = "index_url";
const indexCacheKey = "index_cache";

/**
 * AI:根据资源地址推断内容格式。
 * @param {string} url AI:资源地址。
 * @returns {string} AI:format 值（html/markdown/空）。
 */
function resolveContentFormat(url) {
  const lower = String(url || "").toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    return "html";
  }
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
    return "markdown";
  }
  return "";
}

export default {
  data() {
    return {
      loading: false,
      error: "",
      activeType: "video",
      videoItems: [],
      articleItems: []
    };
  },
  computed: {
    /**
     * AI:根据当前类型返回展示列表。
     * @returns {Array} AI:当前展示数据。
     */
    activeItems() {
      return this.activeType === "video" ? this.videoItems : this.articleItems;
    },
    /**
     * AI:返回当前类型标签文本。
     * @returns {string} AI:标签文本。
     */
    activeLabel() {
      return this.activeType === "video" ? "视频" : "图文";
    }
  },
  onShow() {
    this.fetchIndex();
  },
  /**
   * AI:处理下拉刷新触发，拉取最新清单并结束刷新动画。
   * @returns {void} AI:无返回值。
   */
  onPullDownRefresh() {
    if (this.loading) {
      uni.stopPullDownRefresh();
      return;
    }
    Promise.resolve(this.fetchIndex())
      .catch(() => {})
      .finally(() => {
        uni.stopPullDownRefresh();
      });
  },
  methods: {
    /**
     * AI:切换当前媒体类型。
     * @param {string} type AI:媒体类型。
     * @returns {void} AI:无返回值。
     */
    setActiveType(type) {
      this.activeType = type;
    },
    /**
     * AI:处理条目点击事件，按类型跳转。
     * @param {Object} item AI:条目信息。
     * @param {number} index AI:条目索引。
     * @returns {void} AI:无返回值。
     */
    handleItemClick(item, index) {
      if (item.type === "article") {
        this.openArticle(item);
        return;
      }
      this.openVideo(item, index);
    },
    /**
     * AI:跳转到视频播放页。
     * @param {Object} item AI:视频条目。
     * @param {number} index AI:条目索引。
     * @returns {void} AI:无返回值。
     */
    openVideo(item, index) {
      const src = this.resolveItemSource(item);
      if (!src) {
        uni.showToast({ title: "缺少播放地址", icon: "none" });
        return;
      }
      const storage = createUniStorage();
      const queue = Array.isArray(this.videoItems) ? this.videoItems.slice() : [];
      const resolvedIndex = Number.isFinite(index)
        ? index
        : queue.findIndex((entry) => entry.id === item.id);
      const safeIndex = resolvedIndex >= 0 ? resolvedIndex : 0;
      savePlayerQueue(storage, queue, safeIndex);
      const title = item.title ? encodeURIComponent(item.title) : "";
      uni.navigateTo({ url: `/pages/player/index?src=${encodeURIComponent(src)}&title=${title}` });
    },
    /**
     * AI:跳转到图文阅读页。
     * @param {Object} item AI:图文条目。
     * @returns {void} AI:无返回值。
     */
    openArticle(item) {
      const src = this.resolveItemSource(item);
      if (!src) {
        uni.showToast({ title: "缺少阅读地址", icon: "none" });
        return;
      }
      const title = item.title ? encodeURIComponent(item.title) : "";
      const origin = item && item.url ? encodeURIComponent(item.url) : "";
      const format =
        (item && item.format ? String(item.format) : "") ||
        resolveContentFormat(item && item.url ? item.url : "") ||
        (item && item.type === "article" ? "html" : "");
      const formatParam = format ? `&format=${encodeURIComponent(format)}` : "";
      const originParam = origin ? `&origin=${origin}` : "";
      uni.navigateTo({
        url: `/pages/reader/index?src=${encodeURIComponent(src)}&title=${title}${formatParam}${originParam}`
      });
    },
    /**
     * AI:解析条目可用地址。
     * @param {Object} item AI:条目信息。
     * @returns {string} AI:可用地址。
     */
    resolveItemSource(item) {
      return item && item.url ? item.url : "";
    },
    /**
     * AI:拉取清单并更新页面数据。
     * @returns {Promise<boolean>} AI:返回 Promise，用于结束加载状态。
     */
    fetchIndex() {
      const storage = createUniStorage();
      const adapter = createStorageAdapter(storage);
      const indexUrl = storage.get(indexUrlKey);
      if (!indexUrl) {
        this.error = "请在设置中填写清单地址";
        this.videoItems = [];
        this.articleItems = [];
        return Promise.resolve(false);
      }
      this.loading = true;
      this.error = "";
      return new Promise((resolve) => {
        uni.request({
          url: indexUrl,
          success: (res) => {
            if (res.statusCode === 200 && res.data) {
              adapter.setJson(indexCacheKey, res.data);
              this.applyItems(res.data);
              return;
            }
            this.applyCache(adapter);
          },
          fail: () => {
            this.applyCache(adapter);
          },
          complete: () => {
            this.loading = false;
            resolve(true);
          }
        });
      });
    },
    /**
     * AI:将清单数据应用到页面状态。
     * @param {Object} data AI:清单数据。
     * @returns {void} AI:无返回值。
     */
    applyItems(data) {
      const normalized = normalizeIndexItems(data);
      this.videoItems = normalized.items.filter((item) => item.type === "video");
      this.articleItems = normalized.items.filter((item) => item.type === "article");
    },
    /**
     * AI:从缓存恢复清单并更新页面状态。
     * @param {{getJson: function(string): Object|null}} adapter AI:缓存读取适配器。
     * @returns {void} AI:无返回值。
     */
    applyCache(adapter) {
      const cached = adapter.getJson(indexCacheKey);
      if (cached) {
        this.applyItems(cached);
        return;
      }
      this.error = "清单加载失败，请检查网络或地址";
      this.videoItems = [];
      this.articleItems = [];
    },
    /**
     * AI:触发离线下载并写入本地记录。
     * @param {Object} item AI:待下载条目。
     * @returns {void} AI:无返回值。
     */
    addDownload(item) {
      if (!item || item.type !== "video") {
        return;
      }
      const storage = createUniStorage();
      const service = createOfflineService(storage, createUniDownloader());
      service
        .addDownload(item)
        .then(() => {
          uni.showToast({ title: "已加入离线", icon: "success" });
        })
        .catch(() => {
          uni.showToast({ title: "下载失败，请到离线页查看原因", icon: "none" });
        });
    },
    /**
     * AI:格式化视频时长。
     * @param {number|string} seconds AI:秒数。
     * @returns {string} AI:格式化后的时长。
     */
    formatDuration(seconds) {
      const value = Number(seconds);
      if (!Number.isFinite(value) || value <= 0) {
        return "未知";
      }
      const total = Math.floor(value);
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const secs = total % 60;
      if (hours > 0) {
        return `${padTime(hours)}:${padTime(minutes)}:${padTime(secs)}`;
      }
      return `${padTime(minutes)}:${padTime(secs)}`;
    },
    /**
     * AI:格式化字节大小。
     * @param {number|string} bytes AI:字节数。
     * @returns {string} AI:格式化后的大小。
     */
    formatSize(bytes) {
      const value = Number(bytes);
      if (!Number.isFinite(value) || value <= 0) {
        return "未知";
      }
      const units = ["B", "KB", "MB", "GB"];
      let size = value;
      let unitIndex = 0;
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
      }
      const fixed = size >= 100 || unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
      return `${size.toFixed(fixed)}${units[unitIndex]}`;
    }
  }
};

/**
 * AI:补齐时间显示。
 * @param {number} value AI:数字。
 * @returns {string} AI:补齐后的字符串。
 */
function padTime(value) {
  const num = Math.floor(Number(value));
  return num < 10 ? `0${num}` : String(num);
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
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.02em;
  font-family: var(--font-display);
}

.subtitle {
  display: block;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.media-tabs {
  display: inline-flex;
  gap: 8px;
  padding: 6px;
  border-radius: var(--radius-pill);
  background: rgba(31, 27, 22, 0.04);
  border: 1px solid rgba(31, 27, 22, 0.12);
  box-shadow: var(--shadow-soft);
  margin-bottom: 18px;
}

.media-tab {
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--color-muted);
  transition: all var(--duration-fast) ease;
}

.media-tab.active {
  background-color: rgba(217, 108, 47, 0.18);
  color: #8f3d17;
  border-color: rgba(217, 108, 47, 0.4);
  box-shadow: 0 6px 14px rgba(217, 108, 47, 0.16);
}

.columns {
  display: flex;
  gap: 12px;
}

.column {
  flex: 1;
}

.cinematic-card {
  background: rgba(255, 255, 255, 0.9);
}

.column-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.item-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-title {
  font-size: 14px;
  line-height: 1.4;
  color: var(--color-text);
}

.item-desc {
  font-size: 12px;
  line-height: 1.5;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
}

.item-cover {
  width: 96px;
  height: 56px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(217, 108, 47, 0.18), rgba(31, 27, 22, 0.08));
  border: 1px solid rgba(31, 27, 22, 0.08);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
}

.item-cover-image {
  width: 100%;
  height: 100%;
  display: block;
}

.item-card {
  margin-top: 12px;
  padding: 14px 14px;
  border-radius: 12px;
  border: 1px solid rgba(31, 27, 22, 0.08);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: var(--shadow-soft);
  animation: rise-fade 360ms ease-out both;
  animation-delay: var(--delay);
}

.download {
  min-width: 84px;
}

.placeholder {
  margin-top: 12px;
  font-size: 12px;
  letter-spacing: 0.04em;
}

.loading {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
}

.error-card {
  margin-bottom: 16px;
  background: rgba(255, 242, 233, 0.9);
  border: 1px solid rgba(217, 108, 47, 0.25);
}

.error-text {
  color: #b45309;
  font-size: 12px;
}
</style>
