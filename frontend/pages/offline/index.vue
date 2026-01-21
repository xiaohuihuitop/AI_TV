<template>
  <view class="app-page">
    <view class="header">
      <text class="title">离线</text>
      <text class="subtitle muted">本地缓存的内容</text>
    </view>
    <view class="columns">
      <view class="column card">
        <text class="column-title">视频</text>
        <view v-if="videoItems.length === 0" class="placeholder muted">暂无下载</view>
        <view v-for="item in videoItems" :key="item.id" class="item">
          <text class="item-title">{{ item.title }}</text>
          <button class="remove" size="mini" @click="removeDownload(item)">删除</button>
        </view>
      </view>
      <view class="column card">
        <text class="column-title">图文</text>
        <view v-if="articleItems.length === 0" class="placeholder muted">暂无下载</view>
        <view v-for="item in articleItems" :key="item.id" class="item">
          <text class="item-title">{{ item.title }}</text>
          <button class="remove" size="mini" @click="removeDownload(item)">删除</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
const { createOfflineService } = require("../../utils/offlineService.js");

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
      videoItems: [],
      articleItems: []
    };
  },
  onShow() {
    this.listDownloads();
  },
  methods: {
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

.item-title {
  flex: 1;
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
