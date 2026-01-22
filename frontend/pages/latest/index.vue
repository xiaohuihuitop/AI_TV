<template>
  <view class="app-page">
    <view class="header">
      <text class="title">最新</text>
      <text class="subtitle muted">从清单加载内容</text>
    </view>
    <view v-if="error" class="error-card card">
      <text class="error-text">{{ error }}</text>
    </view>
    <view class="columns">
      <view class="column card">
        <text class="column-title">视频</text>
        <view v-if="videoItems.length === 0" class="placeholder muted">暂无数据</view>
        <view v-for="item in videoItems" :key="item.id" class="item">
          <text class="item-title">{{ item.title }}</text>
          <button class="download" size="mini" @click="addDownload(item)">下载</button>
        </view>
      </view>
      <view class="column card">
        <text class="column-title">图文</text>
        <view v-if="articleItems.length === 0" class="placeholder muted">暂无数据</view>
        <view v-for="item in articleItems" :key="item.id" class="item">
          <text class="item-title">{{ item.title }}</text>
          <button class="download" size="mini" @click="addDownload(item)">下载</button>
        </view>
      </view>
    </view>
    <view v-if="loading" class="loading muted">加载中...</view>
  </view>
</template>

<script>
import { normalizeIndexItems, createStorageAdapter } from "../../utils/indexService.js";
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
 * AI:创建下载适配器，封装下载与保存流程。
 * @returns {{download: function(string): Promise<{tempFilePath: string}>, save: function(string): Promise<{savedFilePath: string}>}} AI:下载适配器。
 */
function createUniDownloader() {
  return {
    download(url) {
      return new Promise((resolve, reject) => {
        uni.downloadFile({
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
    }
  };
}

const indexUrlKey = "index_url";
const indexCacheKey = "index_cache";

export default {
  data() {
    return {
      loading: false,
      error: "",
      videoItems: [],
      articleItems: []
    };
  },
  onShow() {
    this.fetchIndex();
  },
  methods: {
    /**
     * AI:拉取清单并更新页面数据。
     * @returns {void} AI:无返回值。
     */
    fetchIndex() {
      const storage = createUniStorage();
      const adapter = createStorageAdapter(storage);
      const indexUrl = storage.get(indexUrlKey);
      if (!indexUrl) {
        this.error = "请在设置中填写清单地址";
        this.videoItems = [];
        this.articleItems = [];
        return;
      }
      this.loading = true;
      this.error = "";
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
        }
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
      const storage = createUniStorage();
      const service = createOfflineService(storage, createUniDownloader());
      service
        .addDownload(item)
        .then(() => {
          uni.showToast({ title: "已加入离线", icon: "success" });
        })
        .catch(() => {
          uni.showToast({ title: "下载失败", icon: "none" });
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

.download {
  background: var(--color-accent);
  color: #ffffff;
}

.placeholder {
  margin-top: 12px;
  font-size: 12px;
}

.loading {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
}

.error-card {
  margin-bottom: 16px;
  border: 1px solid rgba(217, 108, 47, 0.2);
}

.error-text {
  color: var(--color-accent);
  font-size: 12px;
}
</style>
