<template>
  <view class="app-page offline-page">
    <view class="cache-summary card">
      <view>
        <text class="cache-summary-title">自动缓存</text>
        <text class="cache-summary-value">{{ cacheUsageText }}</text>
      </view>
      <button class="btn btn-ghost cache-summary-clear" @click="clearAutoCache">清理</button>
    </view>
    <empty-state
      v-if="cacheItems.length === 0"
      title="暂无缓存"
      description="打开视频、图片或图文后，内容会自动保存在这里。"
    />
    <view v-else class="media-list">
      <media-list-card
        v-for="(item, index) in cacheItems"
        :key="`cache-${item.identity}`"
        :item="item"
        :meta-text="cacheMetaText(item)"
        @click="openCachedItem(item, index)"
      >
        <template v-slot:status>
          <text v-if="item.status === 'caching'" class="cache-status pending">自动缓存中</text>
          <text v-else-if="item.status === 'failed'" class="cache-status failed">缓存失败</text>
          <text v-else class="cache-status done">已缓存</text>
        </template>
        <template v-slot:action>
          <button
            v-if="item.status !== 'caching'"
            class="btn btn-ghost remove"
            @click="removeAutoCache(item)"
          >
            清理
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
import { savePlayerQueue } from "../../utils/playerQueue.js";
import { savePhotoAlbum } from "../../utils/photoQueue.js";
import { formatSize } from "../../utils/mediaFormat.js";
import { restoreStandardSystemUi } from "../../utils/immersivePlayer.js";
import {
  createAppResourceCache,
  createUniStorage as createCacheStorage,
  loadResourceCacheConfig
} from "../../utils/resourceCacheRuntime.js";

function resolvePlusRuntime() {
  return typeof plus !== "undefined" ? plus : null;
}

export default {
  components: { AppTabBar, EmptyState, MediaListCard },
  data() {
    return {
      cacheItems: [],
      cacheUsage: { bytes: 0, items: 0, maxBytes: 0, maxItems: 0 }
    };
  },
  computed: {
    cacheUsageText() {
      const megabytes = (this.cacheUsage.bytes / 1024 / 1024).toFixed(1);
      const limit = (this.cacheUsage.maxBytes / 1024 / 1024 / 1024).toFixed(1);
      return `${megabytes} MB / ${limit} GB（${this.cacheUsage.items}/${this.cacheUsage.maxItems} 项）`;
    }
  },
  onShow() {
    restoreStandardSystemUi(resolvePlusRuntime);
    if (typeof uni.hideTabBar === "function") {
      uni.hideTabBar({ animation: false });
    }
    this.refreshCache();
  },
  methods: {
    createCacheService() {
      const storage = createCacheStorage();
      const config = loadResourceCacheConfig(storage);
      return createAppResourceCache(storage, undefined, config);
    },
    refreshCache() {
      const service = this.createCacheService();
      this.cacheItems = service.list().filter((entry) => entry.status !== "failed" || entry.last_error);
      this.cacheUsage = service.getUsage();
    },
    cacheMetaText(item) {
      const typeText = item.type === "video" ? "视频" : item.type === "photo" ? "照片" : "图文";
      return `${typeText} · ${formatSize(item.bytes)}`;
    },
    openCachedItem(item, index) {
      if (!item || item.status === "caching") return;
      if (item.type === "video") {
        const queue = this.cacheItems.filter((entry) => entry.type === "video" && entry.status === "done");
        const queueIndex = queue.findIndex((entry) => entry.identity === item.identity);
        savePlayerQueue({ set: (key, value) => uni.setStorageSync(key, value) }, queue, Math.max(0, queueIndex));
        const title = item.title ? encodeURIComponent(item.title) : "";
        uni.navigateTo({ url: `/pages/player/index?src=${encodeURIComponent(item.local_path || item.url)}&title=${title}&autoplay=1` });
        return;
      }
      if (item.type === "article") {
        const title = item.title ? encodeURIComponent(item.title) : "";
        uni.navigateTo({ url: `/pages/reader/index?src=${encodeURIComponent(item.local_path || item.url)}&id=${encodeURIComponent(item.id)}&title=${title}&format=${encodeURIComponent(item.format || "markdown")}&origin=${encodeURIComponent(item.url)}` });
        return;
      }
      uni.showToast({ title: "图片缓存将在相册中使用", icon: "none" });
    },
    removeAutoCache(item) {
      uni.showModal({
        title: "清理缓存",
        content: "只清理这项自动缓存，不影响手动下载记录。",
        confirmText: "清理",
        cancelText: "取消",
        confirmColor: "#a84616",
        success: (res) => {
          if (!res.confirm) return;
          this.createCacheService().remove(item)
            .then(() => {
              this.refreshCache();
              uni.showToast({ title: "已清理", icon: "success" });
            })
            .catch(() => uni.showToast({ title: "清理失败，请重试", icon: "none" }));
        }
      });
    },
    clearAutoCache() {
      uni.showModal({
        title: "清理自动缓存",
        content: "只清理自动缓存，不会删除手动下载记录。",
        confirmText: "清理",
        cancelText: "取消",
        confirmColor: "#a84616",
        success: (res) => {
          if (!res.confirm) return;
          this.createCacheService().clearAll().then(() => {
            this.refreshCache();
            uni.showToast({ title: "已清理", icon: "success" });
          }).catch(() => uni.showToast({ title: "清理失败，请重试", icon: "none" }));
        }
      });
    }
  }
};
</script>

<style scoped>
.cache-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}

.cache-summary-title,
.cache-summary-value {
  display: block;
}

.cache-summary-title {
  font-size: 15px;
  font-weight: 700;
}

.cache-summary-value {
  margin-top: 4px;
  color: var(--color-muted);
  font-size: 13px;
}

.cache-summary-clear,
.remove {
  min-width: 78px;
  min-height: var(--control-height);
}

.media-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cache-status {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 700;
}

.cache-status.pending {
  color: #8a5b12;
  background: #fff4d6;
}

.cache-status.done {
  color: #216747;
  background: #eaf7ef;
}

.cache-status.failed {
  color: #a84616;
  background: #fff0e8;
}
</style>
