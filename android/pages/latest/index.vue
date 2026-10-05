<template>
  <view class="app-page latest-page">
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
      <view
        class="media-tab"
        :class="{ active: activeType === 'photo' }"
        @click="setActiveType('photo')"
      >
        照片
      </view>
    </view>

    <view v-if="cacheNotice" class="feed-notice">
      <text>{{ cacheNotice }}</text>
    </view>

    <view class="feed-content">
      <view v-if="feedViewState === 'loading'" class="status-state muted">正在加载内容…</view>
      <empty-state
        v-else-if="feedViewState === 'error'"
        :title="error"
        description="请到设置页检查服务器地址，确认服务已经启动后下拉刷新。"
      />
      <empty-state
        v-else-if="feedViewState === 'empty'"
        :title="emptyTitle"
        :description="emptyDescription"
      />
      <view v-else class="media-list">
        <media-list-card
          v-for="(item, index) in activeItems"
          :key="`${item.type}-${item.id}`"
          :item="item"
          :duration-text="item.type === 'video' ? `时长 ${formatDuration(item.duration_seconds)}` : ''"
          :size-text="item.type === 'video' ? `大小 ${formatSize(item.size_bytes)}` : ''"
          :meta-text="item.type === 'photo' ? `${item.count} 张照片` : ''"
          @click="handleItemClick(item, index)"
          @cover-error="markCoverRefreshNeeded"
        >
          <template v-if="item.type === 'video'" v-slot:status>
            <text v-if="isAutoCaching(item)" class="download-status pending">自动缓存中</text>
            <text v-else-if="isAutoCached(item)" class="download-status done">已缓存</text>
            <text v-else-if="isAutoCacheFailed(item)" class="download-status failed">缓存失败</text>
            <text v-else class="download-status online">在线</text>
          </template>
        </media-list-card>
      </view>
    </view>

    <app-tab-bar active="latest" />
  </view>
</template>

<script>
import AppTabBar from "../../components/AppTabBar.vue";
import EmptyState from "../../components/EmptyState.vue";
import MediaListCard from "../../components/MediaListCard.vue";
import {
  normalizeIndexItems,
  createStorageAdapter,
  applyLocalDownload,
  refreshCoverUrls
} from "../../utils/indexService.js";
import {
  buildDownloadIdentity,
  createOfflineService,
  buildDownloadStatusMap
} from "../../utils/offlineService.js";
import { savePlayerQueue } from "../../utils/playerQueue.js";
import { savePhotoAlbum } from "../../utils/photoQueue.js";
import { createAppResourceCache, canAutoCache, createUniResourceFileApi, createUniStorage as createResourceStorage, loadResourceCacheConfig, applyCachedResourcePaths } from "../../utils/resourceCacheRuntime.js";
import { buildResourceIdentity } from "../../utils/resourceCacheService.js";
import { formatDuration, formatSize } from "../../utils/mediaFormat.js";
import { defaultIndexUrl, normalizeRequestUrl } from "../../utils/appConfig.js";
import {
  deriveFeedViewState,
  resolveCachedManifest,
  resolveIndexLoadState
} from "../../utils/indexState.js";
import { restoreStandardSystemUi } from "../../utils/immersivePlayer.js";

function resolvePlusRuntime() {
  return typeof plus !== "undefined" ? plus : null;
}

function createUniStorage() {
  return {
    get: (key) => uni.getStorageSync(key),
    set: (key, value) => uni.setStorageSync(key, value),
    remove: (key) => uni.removeStorageSync(key)
  };
}

function createUniDownloader() {
  return {
    download(url, onProgress) {
      return new Promise((resolve, reject) => {
        const task = uni.downloadFile({
          url,
          success: (res) => {
            if (res.statusCode === 200) {
              resolve({ tempFilePath: res.tempFilePath });
              return;
            }
            reject(new Error(`下载失败: ${res.statusCode}`));
          },
          fail: reject
        });
        if (task && typeof task.onProgressUpdate === "function") {
          task.onProgressUpdate((res) => onProgress && onProgress(res.progress));
        }
      });
    },
    save(tempFilePath) {
      return new Promise((resolve, reject) => {
        uni.saveFile({
          tempFilePath,
          success: (res) => resolve({ savedFilePath: res.savedFilePath }),
          fail: reject
        });
      });
    },
    saveWithPath(tempFilePath, filePath) {
      return new Promise((resolve, reject) => {
        uni.saveFile({
          tempFilePath,
          filePath,
          success: (res) => resolve({ savedFilePath: res.savedFilePath || filePath }),
          fail: reject
        });
      });
    }
  };
}

const indexUrlKey = "index_url";
const indexCacheKey = "index_cache";

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

function appendCacheBuster(url) {
  if (!url) {
    return "";
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_t=${Date.now()}`;
}

export default {
  components: {
    AppTabBar,
    EmptyState,
    MediaListCard
  },
  data() {
    return {
      loading: false,
      error: "",
      cacheNotice: "",
      activeType: "video",
      videoItems: [],
      articleItems: [],
      photoItems: [],
      downloadStatusMap: {},
      downloadRefreshTimer: null,
      pageVisible: false,
      indexRequest: null,
      indexRequestUrl: "",
      indexRequestSequence: 0,
      renderedSourceUrl: "",
      coverRefreshNeeded: false
    };
  },
  computed: {
    activeItems() {
      if (this.activeType === "video") {
        return this.videoItems;
      }
      if (this.activeType === "photo") {
        return this.photoItems;
      }
      return this.articleItems;
    },
    feedViewState() {
      return deriveFeedViewState({
        loading: this.loading,
        error: this.error,
        itemCount: this.activeItems.length
      });
    },
    emptyTitle() {
      if (this.activeType === "video") {
        return "暂无视频";
      }
      if (this.activeType === "photo") {
        return "暂无相册";
      }
      return "暂无图文";
    },
    emptyDescription() {
      if (this.activeType === "video") {
        return "仅显示已完成处理的视频。";
      }
      if (this.activeType === "photo") {
        return "管理员发布相册后会显示在这里。";
      }
      return "管理员发布图文后会显示在这里。";
    }
  },
  onShow() {
    this.pageVisible = true;
    restoreStandardSystemUi(resolvePlusRuntime);
    if (typeof uni.hideTabBar === "function") {
      uni.hideTabBar({ animation: false });
    }
    if (this.refreshDownloadStatus()) {
      this.startDownloadWatcher();
    }
    this.fetchIndex();
  },
  onHide() {
    this.pageVisible = false;
    this.stopDownloadWatcher();
  },
  onUnload() {
    this.pageVisible = false;
    this.stopDownloadWatcher();
  },
  onPullDownRefresh() {
    if (this.loading) {
      uni.stopPullDownRefresh();
      return;
    }
    Promise.resolve(this.fetchIndex(true))
      .catch(() => {})
      .finally(() => uni.stopPullDownRefresh());
  },
  methods: {
    setActiveType(type) {
      this.activeType = type;
    },
    markCoverRefreshNeeded() {
      this.coverRefreshNeeded = true;
    },
    refreshDownloadStatus() {
      const service = createOfflineService(createUniStorage(), createUniDownloader());
      const list = service.listDownloads();
      this.downloadStatusMap = buildDownloadStatusMap(list);
      this.videoItems = applyLocalDownload(this.videoItems, this.downloadStatusMap);
      return list.some((entry) => entry.status === "downloading");
    },
    startDownloadWatcher() {
      if (!this.pageVisible) {
        return;
      }
      this.stopDownloadWatcher();
      this.downloadRefreshTimer = setInterval(() => {
        if (!this.refreshDownloadStatus()) {
          this.stopDownloadWatcher();
        }
      }, 500);
    },
    stopDownloadWatcher() {
      if (!this.downloadRefreshTimer) {
        return;
      }
      clearInterval(this.downloadRefreshTimer);
      this.downloadRefreshTimer = null;
    },
    handleItemClick(item, index) {
      if (item.type === "article") {
        this.openArticle(item);
        return;
      }
      if (item.type === "photo") {
        this.openAlbum(item);
        return;
      }
      this.openVideo(item, index);
    },
    openAlbum(item) {
      const saved = savePhotoAlbum(createUniStorage(), item, 0);
      if (!saved) {
        uni.showToast({ title: "相册内容无效", icon: "none" });
        return;
      }
      uni.navigateTo({ url: "/pages/photos/index" });
    },
    openVideo(item, index) {
      const src = this.resolveItemSource(item);
      if (!src) {
        uni.showToast({ title: "缺少播放地址", icon: "none" });
        return;
      }
      const queue = Array.isArray(this.videoItems) ? this.videoItems.slice() : [];
      const safeIndex = Number.isFinite(index) ? index : queue.findIndex((entry) => entry.id === item.id);
      savePlayerQueue(createUniStorage(), queue, safeIndex >= 0 ? safeIndex : 0);
      const title = item.title ? encodeURIComponent(item.title) : "";
      uni.navigateTo({
        url: `/pages/player/index?src=${encodeURIComponent(src)}&title=${title}&autoplay=1`
      });
      this.startAutomaticCache(item);
    },
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
        "html";
      uni.navigateTo({
        url: `/pages/reader/index?src=${encodeURIComponent(src)}&id=${encodeURIComponent(item.id || "")}&title=${title}&format=${encodeURIComponent(format)}&origin=${origin}`
      });
      this.startAutomaticCache(item, format);
    },
    startAutomaticCache(item, format = "") {
      if (!item || !item.url || !["video", "article"].includes(item.type || "video")) {
        return;
      }
      const storage = createResourceStorage();
      const config = loadResourceCacheConfig(storage);
      canAutoCache(config).then((allowed) => {
        if (!allowed) {
          return;
        }
        const service = createAppResourceCache(storage, createUniResourceFileApi(), config);
        service.cacheResource({ ...item, format, type: item.type || "video", id: item.id || item.url, cacheFileName: buildCacheFileName(item) }).catch(() => {});
      });
    },
    buildCacheFileName(item) {
      const identity = buildResourceIdentity(item).replace(/[^a-zA-Z0-9_-]/g, "").slice(-48);
      const extension = item && item.format === "html" ? ".html" : item && item.format === "markdown" ? ".md" : ".cache";
      return `_doc/ai_tv_cache_${identity || Date.now()}${extension}`;
    },
    resolveItemSource(item) {
      return item && (item.local_path || item.url) ? item.local_path || item.url : "";
    },
    getAutoCacheEntry(item) {
      const storage = createResourceStorage();
      const config = loadResourceCacheConfig(storage);
      return createAppResourceCache(storage, undefined, config).get(item);
    },
    isAutoCaching(item) {
      const entry = this.getAutoCacheEntry(item);
      return Boolean(entry && entry.status === "caching");
    },
    isAutoCached(item) {
      const entry = this.getAutoCacheEntry(item);
      return Boolean(entry && entry.status === "done" && entry.local_path);
    },
    isAutoCacheFailed(item) {
      const entry = this.getAutoCacheEntry(item);
      return Boolean(entry && entry.status === "failed");
    },

    fetchIndex(forceRefresh = false) {
      const storage = createUniStorage();
      const adapter = createStorageAdapter(storage);
      const indexUrl = storage.get(indexUrlKey) || defaultIndexUrl;
      if (!indexUrl) {
        this.loading = false;
        this.cacheNotice = "";
        this.error = "请在设置中填写清单地址";
        this.videoItems = [];
        this.articleItems = [];
        return Promise.resolve(false);
      }
      const normalizedUrl = normalizeRequestUrl(indexUrl);
      if (this.indexRequest && this.indexRequestUrl === normalizedUrl) {
        return this.indexRequest;
      }
      if (this.renderedSourceUrl && this.renderedSourceUrl !== normalizedUrl) {
        this.videoItems = [];
        this.articleItems = [];
        this.photoItems = [];
        this.renderedSourceUrl = "";
      }
      const requestSequence = this.indexRequestSequence + 1;
      this.indexRequestSequence = requestSequence;
      this.indexRequestUrl = normalizedUrl;
      this.loading = true;
      this.error = "";
      this.cacheNotice = "";
      const requestUrl = forceRefresh ? appendCacheBuster(normalizedUrl) : normalizedUrl;
      this.indexRequest = new Promise((resolve) => {
        uni.request({
          url: requestUrl,
          success: (res) => {
            if (requestSequence !== this.indexRequestSequence) {
              return;
            }
            const state = resolveIndexLoadState({
              statusCode: res.statusCode,
              data: res.data,
              cachedData: adapter.getJson(indexCacheKey),
              sourceUrl: normalizedUrl
            });
            this.applyLoadState(
              state,
              adapter,
              res.statusCode,
              normalizedUrl,
              forceRefresh
            );
          },
          fail: () => {
            if (requestSequence !== this.indexRequestSequence) {
              return;
            }
            this.applyLoadState(
              resolveIndexLoadState({
                statusCode: 0,
                cachedData: adapter.getJson(indexCacheKey),
                sourceUrl: normalizedUrl
              }),
              adapter,
              0,
              normalizedUrl,
              false
            );
          },
          complete: () => {
            if (requestSequence === this.indexRequestSequence) {
              this.loading = false;
              this.indexRequest = null;
              this.indexRequestUrl = "";
            }
            resolve(true);
          }
        });
      });
      return this.indexRequest;
    },
    applyLoadState(state, adapter, statusCode, normalizedUrl, forceRefresh = false) {
      if (state.kind === "fresh") {
        adapter.setJson(indexCacheKey, { sourceUrl: normalizedUrl, data: state.data });
        this.cacheNotice = "";
        this.error = "";
        this.renderedSourceUrl = normalizedUrl;
        this.applyItems(state.data, forceRefresh || this.coverRefreshNeeded);
        return;
      }
      if (state.kind === "cache") {
        this.error = "";
        this.cacheNotice = state.notice;
        this.renderedSourceUrl = normalizedUrl;
        this.applyItems(state.data);
        return;
      }
      if (
        (statusCode === 401 || statusCode === 403) &&
        resolveCachedManifest(adapter.getJson(indexCacheKey), normalizedUrl).valid
      ) {
        adapter.remove(indexCacheKey);
      }
      this.cacheNotice = "";
      this.error = state.message;
      this.videoItems = [];
      this.articleItems = [];
      this.photoItems = [];
      this.renderedSourceUrl = "";
    },
    applyItems(data, refreshCovers = false) {
      const normalized = normalizeIndexItems(data);
      const withLocalDownload = applyLocalDownload(normalized.items, this.downloadStatusMap);
      const cacheStorage = createResourceStorage();
      const cacheConfig = loadResourceCacheConfig(cacheStorage);
      const cacheService = createAppResourceCache(cacheStorage, undefined, cacheConfig);
      const withAutoCache = applyCachedResourcePaths(withLocalDownload, cacheService);
      const items = refreshCovers ? refreshCoverUrls(withAutoCache, Date.now()) : withAutoCache;
      if (refreshCovers) {
        this.coverRefreshNeeded = false;
      }
      this.videoItems = items.filter((item) => item.type === "video");
      this.articleItems = items.filter((item) => item.type === "article");
      this.photoItems = items.filter((item) => item.type === "photo");
    },
    formatDuration,
    formatSize
  }
};
</script>

<style scoped>
.media-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  width: 100%;
  padding: 4px;
  margin-bottom: 14px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-card);
  background: var(--color-surface);
}

.media-tab {
  min-height: 44px;
  border-radius: var(--radius-soft);
  color: var(--color-muted);
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-tab.active {
  color: var(--color-accent);
  background: rgba(168, 70, 22, 0.1);
}

.feed-notice {
  margin-bottom: 12px;
  padding: 9px 12px;
  border-left: 3px solid #b7791f;
  background: #fff8e8;
  color: #76531e;
  font-size: 14px;
  line-height: 1.5;
}

.feed-content,
.media-list {
  width: 100%;
  min-width: 0;
}

.media-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.status-state {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.download-status {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 700;
}

.download-status.pending {
  color: #8a5b12;
  background: #fff4d6;
}

.download-status.done {
  color: #216747;
  background: #eaf7ef;
}

.download-status.failed {
  color: #a84616;
  background: #fff0e8;
}

.download-status.online {
  color: var(--color-muted);
  background: var(--color-surface-muted);
}
</style>
