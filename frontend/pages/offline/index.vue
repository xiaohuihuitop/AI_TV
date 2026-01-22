<template>
  <view class="app-page">
    <view class="header">
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
      <view class="column card">
        <text class="column-title">{{ activeLabel }}</text>
        <view v-if="activeItems.length === 0" class="placeholder muted">暂无下载</view>
        <view v-for="item in activeItems" :key="item.id" class="item" @click="handleItemClick(item)">
          <view class="item-main">
            <text class="item-title">{{ item.title }}</text>
          </view>
          <button class="remove" size="mini" @click.stop="removeDownload(item)">删除</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { createOfflineService } from "../../utils/offlineService.js";

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

export default {
  data() {
    return {
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
    this.listDownloads();
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
     * @returns {void} AI:无返回值。
     */
    handleItemClick(item) {
      if (item.type === "article") {
        this.openArticle(item);
        return;
      }
      this.openVideo(item);
    },
    /**
     * AI:跳转到视频播放页。
     * @param {Object} item AI:视频条目。
     * @returns {void} AI:无返回值。
     */
    openVideo(item) {
      const src = this.resolveItemSource(item);
      if (!src) {
        uni.showToast({ title: "尚未下载完成", icon: "none" });
        return;
      }
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
        uni.showToast({ title: "尚未下载完成", icon: "none" });
        return;
      }
      const title = item.title ? encodeURIComponent(item.title) : "";
      uni.navigateTo({ url: `/pages/reader/index?src=${encodeURIComponent(src)}&title=${title}` });
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
     * @returns {void} AI:无返回值。
     */
    listDownloads() {
      const storage = createUniStorage();
      const service = createOfflineService(storage, createEmptyDownloader());
      const list = service.listDownloads();
      this.videoItems = list.filter((item) => item.type === "video");
      this.articleItems = list.filter((item) => item.type === "article");
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
          this.listDownloads();
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
  margin-bottom: 16px;
}

.title {
  font-size: 22px;
  font-weight: 600;
}

.subtitle {
  display: block;
  margin-top: 6px;
  font-size: 12px;
}

.media-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.media-tab {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(107, 100, 93, 0.3);
  font-size: 13px;
  color: var(--color-muted);
}

.media-tab.active {
  background-color: #1f1b16;
  color: #ffffff;
  border-color: #1f1b16;
}

.columns {
  display: flex;
  gap: 12px;
}

.column {
  flex: 1;
}

.column-title {
  font-size: 16px;
  font-weight: 600;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  gap: 8px;
}

.item-main {
  flex: 1;
}

.item-title {
  font-size: 13px;
}

.remove {
  background: #d94f2f;
  color: #ffffff;
}

.placeholder {
  margin-top: 12px;
  font-size: 12px;
}
</style>
