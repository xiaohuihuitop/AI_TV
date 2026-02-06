<template>
  <view class="app-page">
    <view class="columns">
      <view class="column card cinematic-card">
        <view v-if="videoItems.length === 0" class="placeholder muted">暂无下载</view>
        <view
          v-for="(item, index) in videoItems"
          :key="item.id"
          class="item item-card"
          :style="{ '--delay': `${index * 60}ms` }"
          @click="openVideo(item, index)"
        >
          <view class="item-cover">
            <image v-if="item.cover" class="item-cover-image" :src="item.cover" mode="aspectFill" />
          </view>
          <view class="item-main">
            <text class="item-title">{{ item.title }}</text>
            <view class="item-meta muted">
              <text>时长：{{ formatDuration(item.duration_seconds) }}</text>
              <text>大小：{{ formatSize(item.size_bytes) }}</text>
            </view>
            <view v-if="item.status !== 'done'" class="progress">
              <view class="progress-bar" :style="{ width: `${item.progress}%` }"></view>
            </view>
            <text v-if="item.status !== 'done'" class="progress-text muted">{{ item.progress }}%</text>
            <text v-if="item.status === 'failed'" class="error-text">失败：{{ item.last_error || "未知错误" }}</text>
            <text v-else-if="item.status !== 'done' && item.last_step" class="progress-text muted">
              步骤：{{ item.last_step }}
            </text>
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
import { formatDuration, formatSize } from "../../utils/mediaFormat.js";

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
    const normalized = String(filePath || "").replace(/^file:\/\//, "");
    uni.removeSavedFile({
      filePath: normalized,
      success: () => resolve(),
      fail: () => {
        if (typeof plus === "undefined" || !plus.io || !plus.io.resolveLocalFileSystemURL) {
          reject(new Error("删除失败"));
          return;
        }
        plus.io.resolveLocalFileSystemURL(
          filePath,
          (entry) => {
            entry.remove(
              () => resolve(),
              () => reject(new Error("删除失败"))
            );
          },
          () => reject(new Error("删除失败"))
        );
      }
    });
  });
}

export default {
  data() {
    return {
      videoItems: [],
      refreshTimer: null
    };
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
     * AI:跳转到视频播放页。
     * @param {Object} item AI:视频条目。
     * @param {number} index AI:条目索引。
     * @returns {void} AI:无返回值。
     */
    openVideo(item, index) {
      const src = this.resolveItemSource(item);
      if (item && item.status === "failed") {
        uni.showToast({ title: "下载失败，请重新下载", icon: "none" });
        return;
      }
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
    },
    formatDuration,
    formatSize
  }
};
</script>

<style scoped>
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
  gap: 6px;
}

.item-title {
  font-size: 14px;
  line-height: 1.4;
  color: var(--color-text);
  word-break: break-all;
  overflow-wrap: anywhere;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
}

.item-meta text {
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(31, 27, 22, 0.08);
  background: rgba(31, 27, 22, 0.05);
}

.item-cover {
  width: 104px;
  height: 62px;
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
  padding: 14px 14px;
  border-radius: 12px;
  border: 1px solid rgba(31, 27, 22, 0.08);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.86));
  box-shadow: var(--shadow-soft);
  animation: rise-fade 360ms ease-out both;
  animation-delay: var(--delay);
}

.progress {
  width: 100%;
  height: 7px;
  border-radius: 999px;
  background: rgba(31, 27, 22, 0.08);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(120deg, #b45309, #f59e0b);
}

.progress-text {
  font-size: 11px;
}

.error-text {
  margin-top: 4px;
  font-size: 11px;
  color: #b45309;
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
