<template>
  <view class="app-page">
    <view class="header hero">
      <text class="title">离线</text>
      <text class="subtitle muted">本地缓存的内容</text>
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
    <view class="columns">
      <view class="column card cinematic-card">
        <text class="column-title">{{ activeLabel }}</text>
        <view v-if="activeItems.length === 0" class="placeholder muted">暂无下载</view>
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
            <view v-if="item.status !== 'done'" class="progress">
              <view class="progress-bar" :style="{ width: `${item.progress}%` }"></view>
            </view>
            <text v-if="item.status !== 'done'" class="progress-text muted">{{ item.progress }}%</text>
          </view>
          <button class="btn btn-ghost remove" size="mini" @click.stop="removeDownload(item)">
            删除
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { createOfflineService } from "../../utils/offlineService.js";
import { savePlayerQueue } from "../../utils/playerQueue.js";
import { resolveCoverUrl } from "../../utils/indexService.js";

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
 * AI:创建最小下载适配器，避免未使用方法报错。
 * @returns {{download: function(string): Promise<Object>, save: function(string): Promise<Object>}} AI:下载适配器。
 */
function createEmptyDownloader() {
  return {
    download: async () => ({}),
    save: async () => ({})
  };
}

/**
 * AI:删除本地缓存文件。
 * @param {string} filePath AI:本地文件路径。
 * @returns {Promise<void>} AI:删除结果。
 */
function removeLocalFile(filePath) {
  return new Promise((resolve, reject) => {
    if (!filePath) {
      resolve();
      return;
    }
    uni.removeSavedFile({
      filePath,
      success: () => resolve(),
      fail: (error) => reject(error)
    });
  });
}

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
      activeType: "video",
      videoItems: [],
      articleItems: [],
      refreshTimer: null
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
    const hasDownloading = this.refreshDownloads();
    if (hasDownloading) {
      this.startProgressWatcher();
    }
  },
  onHide() {
    this.stopProgressWatcher();
  },
  onUnload() {
    this.stopProgressWatcher();
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
        uni.showToast({ title: "尚未下载完成", icon: "none" });
        return;
      }
      const storage = createUniStorage();
      const queue = Array.isArray(this.videoItems)
        ? this.videoItems.filter((entry) => entry.status === "done" && entry.local_path)
        : [];
      const resolvedIndex = queue.findIndex((entry) => entry.id === item.id);
      const safeIndex = resolvedIndex >= 0 ? resolvedIndex : 0;
      savePlayerQueue(storage, queue, safeIndex);
      const title = item.title ? encodeURIComponent(item.title) : "";
      uni.navigateTo({
        url: `/pages/player/index?src=${encodeURIComponent(src)}&title=${title}&autoplay=1`
      });
    },
    /**
     * AI:跳转到图文阅读页。
     * @param {Object} item AI:图文条目。
     * @returns {void} AI:无返回值。
     */
    openArticle(item) {
      const src = this.resolveItemSource(item);
      if (!src) {
        uni.showToast({ title: "尚未下载完成", icon: "none" });
        return;
      }
      const title = item.title ? encodeURIComponent(item.title) : "";
      const origin = item && item.url ? encodeURIComponent(item.url) : "";
      const format =
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
      return item && item.local_path ? item.local_path : "";
    },
    /**
     * AI:加载离线下载列表并渲染。
     * @returns {boolean} AI:是否存在下载中条目。
     */
    refreshDownloads() {
      const storage = createUniStorage();
      const service = createOfflineService(storage, createEmptyDownloader());
      const list = service.listDownloads().map((item) => ({
        ...item,
        cover: resolveCoverUrl(item)
      }));
      this.videoItems = list.filter((item) => item.type === "video");
      this.articleItems = list.filter((item) => item.type === "article");
      return list.some((item) => item.status !== "done");
    },
    /**
     * AI:启动下载进度刷新定时器。
     * @returns {void} AI:无返回值。
     */
    startProgressWatcher() {
      this.stopProgressWatcher();
      this.refreshTimer = setInterval(() => {
        const hasDownloading = this.refreshDownloads();
        if (!hasDownloading) {
          this.stopProgressWatcher();
        }
      }, 500);
    },
    /**
     * AI:停止下载进度刷新定时器。
     * @returns {void} AI:无返回值。
     */
    stopProgressWatcher() {
      if (!this.refreshTimer) {
        return;
      }
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    },
    /**
     * AI:删除离线记录并清理本地文件。
     * @param {Object} item AI:离线条目。
     * @returns {void} AI:无返回值。
     */
    removeDownload(item) {
      const storage = createUniStorage();
      const service = createOfflineService(storage, createEmptyDownloader());
      removeLocalFile(item.local_path)
        .catch(() => null)
        .then(() => service.removeDownload(item.id))
        .then(() => {
          const hasDownloading = this.refreshDownloads();
          if (!hasDownloading) {
            this.stopProgressWatcher();
          }
          uni.showToast({ title: "已删除", icon: "success" });
        })
        .catch(() => {
          uni.showToast({ title: "删除失败", icon: "none" });
        });
    }
  }
};
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

.progress {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: rgba(31, 27, 22, 0.1);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(120deg, #f97316, #f59e0b);
}

.progress-text {
  font-size: 11px;
}

.remove {
  min-width: 84px;
}

.placeholder {
  margin-top: 12px;
  font-size: 12px;
  letter-spacing: 0.04em;
}
</style>
