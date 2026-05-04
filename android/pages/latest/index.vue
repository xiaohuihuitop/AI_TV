<template>
  <view class="app-page">
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
        <view v-if="activeItems.length === 0" class="placeholder muted">{{ emptyHint }}</view>
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
            v-if="item.type === 'video' && !isDownloaded(item) && !isDownloading(item)"
            class="btn btn-primary download"
            size="mini"
            @click.stop="addDownload(item)"
          >
            下载
          </button>
          <text v-else-if="item.type === 'video' && isDownloading(item)" class="downloading muted">
            下载中{{ formatProgress(item) }}
          </text>
          <text v-else-if="item.type === 'video'" class="downloaded muted">已下载</text>
        </view>
      </view>
    </view>
    <view v-if="loading" class="loading muted">加载中...</view>
  </view>
</template>

<script>
import {
  normalizeIndexItems,
  createStorageAdapter,
  applyLocalCover,
  refreshCoverUrls
} from "../../utils/indexService.js";
import { createOfflineService, buildDownloadStatusMap } from "../../utils/offlineService.js";
import { savePlayerQueue } from "../../utils/playerQueue.js";
import { saveReaderQueue } from "../../utils/readerQueue.js";
import { formatDuration, formatSize } from "../../utils/mediaFormat.js";
import { defaultIndexUrl } from "../../utils/appConfig.js";

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

/**
 * AI:追加时间戳避免缓存，确保进入页面时拉取最新清单。
 * @param {string} url AI:原始地址。
 * @returns {string} AI:追加时间戳后的地址。
 */
function appendCacheBuster(url) {
  if (!url) {
    return "";
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_t=${Date.now()}`;
}

export default {
  data() {
    return {
      loading: false,
      error: "",
      emptyHint: "暂无数据",
      activeType: "video",
      videoItems: [],
      articleItems: [],
      downloadStatusMap: {},
      downloadRefreshTimer: null
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
    const hasDownloading = this.refreshDownloadStatus();
    if (hasDownloading) {
      this.startDownloadWatcher();
    }
    this.fetchIndex();
  },
  onHide() {
    this.stopDownloadWatcher();
  },
  onUnload() {
    this.stopDownloadWatcher();
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
     * AI:刷新已下载的视频标记。
     * @returns {void} AI:无返回值。
     */
    refreshDownloadStatus() {
      const storage = createUniStorage();
      const service = createOfflineService(storage, createUniDownloader());
      const list = service.listDownloads();
      this.downloadStatusMap = buildDownloadStatusMap(list);
      this.videoItems = applyLocalCover(this.videoItems, this.downloadStatusMap);
      return list.some((entry) => entry.status === "downloading");
    },
    /**
     * AI:启动下载状态刷新定时器。
     * @returns {void} AI:无返回值。
     */
    startDownloadWatcher() {
      this.stopDownloadWatcher();
      this.downloadRefreshTimer = setInterval(() => {
        const hasDownloading = this.refreshDownloadStatus();
        if (!hasDownloading) {
          this.stopDownloadWatcher();
        }
      }, 500);
    },
    /**
     * AI:停止下载状态刷新定时器。
     * @returns {void} AI:无返回值。
     */
    stopDownloadWatcher() {
      if (!this.downloadRefreshTimer) {
        return;
      }
      clearInterval(this.downloadRefreshTimer);
      this.downloadRefreshTimer = null;
    },
    /**
     * AI:处理条目点击事件，按类型跳转。
     * @param {Object} item AI:条目信息。
     * @param {number} index AI:条目索引。
     * @returns {void} AI:无返回值。
     */
    handleItemClick(item, index) {
      if (item.type === "article") {
        this.openArticle(item, index);
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
      uni.navigateTo({
        url: `/pages/player/index?src=${encodeURIComponent(src)}&title=${title}&autoplay=1`
      });
    },
    /**
     * AI:跳转到图文阅读页。
     * @param {Object} item AI:图文条目。
     * @returns {void} AI:无返回值。
     */
    openArticle(item, index) {
      const src = this.resolveItemSource(item);
      if (!src) {
        uni.showToast({ title: "缺少阅读地址", icon: "none" });
        return;
      }
      const storage = createUniStorage();
      const queue = Array.isArray(this.articleItems) ? this.articleItems.slice() : [];
      const resolvedIndex = Number.isFinite(index)
        ? index
        : queue.findIndex((entry) => entry.id === item.id);
      const safeIndex = resolvedIndex >= 0 ? resolvedIndex : 0;
      saveReaderQueue(storage, queue, safeIndex);
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
     * AI:判断视频是否已下载。
     * @param {Object} item AI:视频条目。
     * @returns {boolean} AI:是否已下载。
     */
    isDownloaded(item) {
      const status = this.getDownloadStatus(item);
      return status ? status.status === "done" : false;
    },
    /**
     * AI:判断视频是否下载中。
     * @param {Object} item AI:视频条目。
     * @returns {boolean} AI:是否下载中。
     */
    isDownloading(item) {
      const status = this.getDownloadStatus(item);
      return status ? status.status === "downloading" : false;
    },
    /**
     * AI:获取下载状态信息。
     * @param {Object} item AI:视频条目。
     * @returns {{status: string, progress: number}|null} AI:状态信息。
     */
    getDownloadStatus(item) {
      const key = String(item && item.id ? item.id : "");
      if (!key) {
        return null;
      }
      return this.downloadStatusMap[key] || null;
    },
    /**
     * AI:格式化下载进度显示。
     * @param {Object} item AI:视频条目。
     * @returns {string} AI:下载进度文案。
     */
    formatProgress(item) {
      const status = this.getDownloadStatus(item);
      if (!status) {
        return "";
      }
      const value = Number(status.progress);
      if (!Number.isFinite(value) || value <= 0) {
        return "";
      }
      return ` ${Math.floor(value)}%`;
    },
    /**
     * AI:拉取清单并更新页面数据。
     * @returns {Promise<boolean>} AI:返回 Promise，用于结束加载状态。
     */
    fetchIndex() {
      const storage = createUniStorage();
      const adapter = createStorageAdapter(storage);
      const indexUrl = storage.get(indexUrlKey) || defaultIndexUrl;
      if (!indexUrl) {
        this.error = "请在设置中填写清单地址";
        this.videoItems = [];
        this.articleItems = [];
        this.emptyHint = "暂无数据";
        return Promise.resolve(false);
      }
      this.loading = true;
      this.error = "";
      this.emptyHint = "暂无数据";
      const requestUrl = appendCacheBuster(indexUrl);
      return new Promise((resolve) => {
        uni.request({
          url: requestUrl,
          success: (res) => {
            if (res.statusCode === 200 && res.data) {
              adapter.setJson(indexCacheKey, res.data);
              this.applyItems(res.data);
              return;
            }
            if (res.statusCode === 401 || res.statusCode === 403) {
              adapter.remove(indexCacheKey);
              this.videoItems = [];
              this.articleItems = [];
              this.error = "";
              this.emptyHint = "无更新";
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
      const withLocalCover = applyLocalCover(normalized.items, this.downloadStatusMap);
      const refreshed = refreshCoverUrls(withLocalCover, Date.now());
      this.videoItems = refreshed.filter((item) => item.type === "video");
      this.articleItems = refreshed.filter((item) => item.type === "article");
      this.emptyHint = "暂无数据";
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
      this.emptyHint = "暂无数据";
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
      if (this.isDownloaded(item)) {
        uni.showToast({ title: "已下载", icon: "none" });
        return;
      }
      if (this.isDownloading(item)) {
        uni.showToast({ title: "下载中", icon: "none" });
        return;
      }
      const storage = createUniStorage();
      const service = createOfflineService(storage, createUniDownloader());
      service
        .addDownload(item)
        .then(() => {
          const hasDownloading = this.refreshDownloadStatus();
          if (hasDownloading) {
            this.startDownloadWatcher();
          }
          uni.showToast({ title: "已加入离线", icon: "success" });
        })
        .catch(() => {
          const hasDownloading = this.refreshDownloadStatus();
          if (hasDownloading) {
            this.startDownloadWatcher();
          }
          uni.showToast({ title: "下载失败，请到离线页查看原因", icon: "none" });
        });
    },
    formatDuration,
    formatSize
  }
};
</script>

<style scoped>
.media-tabs {
  display: flex;
  width: 100%;
  gap: 0;
  padding: 0;
  border-radius: var(--radius-card);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(31, 27, 22, 0.08);
  box-shadow: var(--shadow-soft);
  margin-bottom: 18px;
}

.media-tab {
  flex: 1;
  padding: 18px 0;
  border-radius: 0;
  border: none;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-align: center;
  color: var(--color-muted);
  transition: all var(--duration-fast) ease;
}

.media-tab.active {
  background: linear-gradient(135deg, rgba(138, 54, 14, 0.24), rgba(192, 86, 33, 0.28));
  color: #6f2608;
  box-shadow: inset 0 0 0 1px rgba(138, 54, 14, 0.32);
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

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-title {
  font-size: 19px;
  line-height: 1.4;
  font-weight: 700;
  color: var(--color-text);
  word-break: break-all;
  overflow-wrap: anywhere;
}

.item-desc {
  font-size: 15px;
  line-height: 1.6;
  word-break: break-all;
  overflow-wrap: anywhere;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 15px;
}

.item-meta text {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(31, 27, 22, 0.08);
  background: rgba(31, 27, 22, 0.05);
}

.item-cover {
  width: 116px;
  height: 70px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(180, 83, 9, 0.18), rgba(31, 27, 22, 0.08));
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
  padding: 16px 14px;
  border-radius: 12px;
  border: 1px solid rgba(31, 27, 22, 0.08);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.86));
  box-shadow: var(--shadow-soft);
  animation: rise-fade 360ms ease-out both;
  animation-delay: var(--delay);
}

.download {
  min-width: 92px;
  flex-shrink: 0;
}

.downloaded {
  min-width: 92px;
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: 999px;
  text-align: center;
  font-size: 15px;
  border: 1px solid rgba(31, 27, 22, 0.12);
  background: rgba(31, 27, 22, 0.06);
}

.downloading {
  min-width: 92px;
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: 999px;
  text-align: center;
  font-size: 15px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.12);
}

.placeholder {
  margin-top: 12px;
  font-size: 16px;
  letter-spacing: 0.04em;
}

.loading {
  margin-top: 16px;
  text-align: center;
  font-size: 16px;
}

.error-card {
  margin-bottom: 16px;
  background: rgba(255, 242, 233, 0.9);
  border: 1px solid rgba(217, 108, 47, 0.25);
}

.error-text {
  color: #8a360e;
  font-size: 16px;
}
</style>
