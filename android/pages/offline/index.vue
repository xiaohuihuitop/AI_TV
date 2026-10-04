<template>
  <view class="app-page offline-page">
    <empty-state
      v-if="videoItems.length === 0"
      title="暂无下载"
      description="下载的视频会保存在这里，断网时也可以观看。"
    />
    <view v-else class="media-list">
      <media-list-card
        v-for="(item, index) in videoItems"
        :key="buildDownloadIdentity(item)"
        :item="item"
        :duration-text="`时长 ${formatDuration(item.duration_seconds)}`"
        :size-text="`大小 ${formatSize(item.size_bytes)}`"
        @click="openVideo(item, index)"
      >
        <template v-if="item.status === 'downloading'" v-slot:status>
          <view class="download-state">
            <view class="progress">
              <view class="progress-bar" :style="{ width: `${item.progress}%` }"></view>
            </view>
            <text class="progress-text muted">
              {{ item.last_step || "下载中" }} {{ item.progress }}%
            </text>
          </view>
        </template>
        <template v-else-if="item.status === 'failed'" v-slot:status>
          <view class="download-state">
            <text class="error-text">下载失败：{{ item.last_error || "未知错误" }}</text>
            <text v-if="item.last_step" class="progress-text muted">{{ item.last_step }}</text>
          </view>
        </template>
        <template v-slot:action>
          <button
            v-if="item.status !== 'downloading'"
            class="btn btn-ghost remove"
            @click="removeDownload(item)"
          >
            删除
          </button>
        </template>
      </media-list-card>
    </view>
    <app-tab-bar active="offline" />
  </view>
</template>

<script>
import AppTabBar from "../../components/AppTabBar.vue";
import EmptyState from "../../components/EmptyState.vue";
import MediaListCard from "../../components/MediaListCard.vue";
import {
  buildDownloadIdentity,
  createOfflineService,
  removeDownloadFiles
} from "../../utils/offlineService.js";
import { savePlayerQueue } from "../../utils/playerQueue.js";
import { resolveCoverUrl } from "../../utils/indexService.js";
import { formatDuration, formatSize } from "../../utils/mediaFormat.js";
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

function createEmptyDownloader() {
  return {
    download: async () => ({}),
    save: async () => ({})
  };
}

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
          (entry) => entry.remove(resolve, () => reject(new Error("删除失败"))),
          () => reject(new Error("删除失败"))
        );
      }
    });
  });
}

export default {
  components: {
    AppTabBar,
    EmptyState,
    MediaListCard
  },
  data() {
    return {
      videoItems: [],
      refreshTimer: null
    };
  },
  onShow() {
    restoreStandardSystemUi(resolvePlusRuntime);
    if (typeof uni.hideTabBar === "function") {
      uni.hideTabBar({ animation: false });
    }
    if (this.refreshDownloads()) {
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
      const queue = Array.isArray(this.videoItems)
        ? this.videoItems.filter((entry) => entry.status === "done" && entry.local_path)
        : [];
      const resolvedIndex = queue.findIndex(
        (entry) => buildDownloadIdentity(entry) === buildDownloadIdentity(item)
      );
      savePlayerQueue(createUniStorage(), queue, resolvedIndex >= 0 ? resolvedIndex : 0);
      const title = item.title ? encodeURIComponent(item.title) : "";
      uni.navigateTo({
        url: `/pages/player/index?src=${encodeURIComponent(src)}&title=${title}&autoplay=1`
      });
    },
    resolveItemSource(item) {
      return item && item.local_path ? item.local_path : "";
    },
    refreshDownloads() {
      const service = createOfflineService(createUniStorage(), createEmptyDownloader());
      const list = service.listDownloads().map((item) => ({ ...item, cover: resolveCoverUrl(item) }));
      this.videoItems = list.filter((item) => item.type === "video");
      return list.some((item) => item.status === "downloading");
    },
    startProgressWatcher() {
      this.stopProgressWatcher();
      this.refreshTimer = setInterval(() => {
        if (!this.refreshDownloads()) {
          this.stopProgressWatcher();
        }
      }, 500);
    },
    stopProgressWatcher() {
      if (!this.refreshTimer) {
        return;
      }
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    },
    removeDownload(item) {
      if (item && item.status === "downloading") {
        uni.showToast({ title: "下载进行中，暂时不能删除", icon: "none" });
        return;
      }
      uni.showModal({
        title: "确认删除",
        content: "删除后需要重新下载才能离线观看。",
        confirmText: "删除",
        cancelText: "取消",
        confirmColor: "#a84616",
        success: (res) => {
          if (!res.confirm) {
            return;
          }
          const service = createOfflineService(createUniStorage(), createEmptyDownloader());
          removeDownloadFiles(item, removeLocalFile)
            .then(() => service.removeDownload(item))
            .then(() => {
              if (!this.refreshDownloads()) {
                this.stopProgressWatcher();
              }
              uni.showToast({ title: "已删除", icon: "success" });
            })
            .catch((error) => {
              if (error && Array.isArray(error.removedFields)) {
                service.clearDownloadPaths(item, error.removedFields);
                this.refreshDownloads();
              }
              uni.showToast({ title: "删除失败，请重试", icon: "none" });
            });
        }
      });
    },
    buildDownloadIdentity,
    formatDuration,
    formatSize
  }
};
</script>

<style scoped>
.media-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.download-state {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.progress {
  width: 100%;
  height: 6px;
  border-radius: var(--radius-pill);
  overflow: hidden;
  background: var(--color-surface-muted);
}

.progress-bar {
  height: 100%;
  background: var(--color-accent-soft);
}

.progress-text,
.error-text {
  font-size: 13px;
  line-height: 1.4;
}

.error-text {
  color: #a84616;
}

.remove {
  min-width: 76px;
  min-height: var(--control-height);
  font-size: 15px;
}
</style>
