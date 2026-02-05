<template>
  <view class="app-page player-page">
    <view class="header hero">
      <text class="title">{{ title || "播放" }}</text>
      <text class="subtitle muted">视频播放预览</text>
    </view>
    <view v-if="error" class="error-card card">
      <text class="error-text">{{ error }}</text>
    </view>
    <view v-else class="video-shell">
      <video
        class="video-player"
        id="playerVideo"
        :src="source"
        :controls="true"
        :autoplay="autoPlay"
        object-fit="contain"
        :show-fullscreen-btn="false"
        :show-center-play-btn="true"
        :show-play-btn="true"
        :style="{ height: `${videoHeight}px` }"
        @ended="handleEnded"
        @play="handlePlay"
      ></video>
      <cover-view v-if="hasEnded" class="replay-overlay">
        <cover-view class="replay-btn" @click="replay">重播</cover-view>
      </cover-view>
    </view>
    <view class="actions">
      <button class="btn btn-ghost nav prev" size="mini" :disabled="!hasPrev" @click="playPrev">
        上一个
      </button>
      <button class="btn btn-ghost back" size="mini" @click="goBack">返回</button>
      <button class="btn btn-ghost nav next" size="mini" :disabled="!hasNext" @click="playNext">
        下一个
      </button>
    </view>
  </view>
</template>

<script>
import { loadPlayerQueue, updatePlayerIndex } from "../../utils/playerQueue.js";

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

export default {
  data() {
    return {
      source: "",
      title: "",
      error: "",
      videoHeight: 220,
      autoPlay: false,
      playlist: [],
      currentIndex: -1,
      hasEnded: false,
      videoContext: null
    };
  },
  computed: {
    /**
     * AI:判断是否存在上一个视频。
     * @returns {boolean} AI:是否可切换上一条。
     */
    hasPrev() {
      return this.currentIndex > 0;
    },
    /**
     * AI:判断是否存在下一个视频。
     * @returns {boolean} AI:是否可切换下一条。
     */
    hasNext() {
      return this.currentIndex >= 0 && this.currentIndex < this.playlist.length - 1;
    }
  },
  /**
   * AI:读取页面参数，初始化播放信息。
   * @param {{src?: string, title?: string}} query AI:路由参数。
   * @returns {void} AI:无返回值。
   */
  onLoad(query) {
    const source = query && query.src ? decodeURIComponent(query.src) : "";
    const title = query && query.title ? decodeURIComponent(query.title) : "";
    const autoPlay = query && query.autoplay === "1";
    this.source = source;
    this.title = title;
    this.autoPlay = autoPlay;
    this.loadPlaylist();
    if (!this.source) {
      this.error = "缺少播放地址";
    }
    this.updateVideoSize();
  },
  onReady() {
    this.videoContext = uni.createVideoContext("playerVideo", this);
    this.playIfAuto();
  },
  methods: {
    /**
     * AI:根据屏幕高度计算视频区域，并为底部按钮留出空间。
     * @returns {void} AI:无返回值。
     */
    updateVideoSize() {
      const info = uni.getSystemInfoSync();
      const width = Number(info.windowWidth || info.screenWidth || 0);
      const height = Number(info.windowHeight || info.screenHeight || 0);
      const safeWidth = Number.isFinite(width) && width > 0 ? width : 360;
      const safeHeight = Number.isFinite(height) && height > 0 ? height : 640;
      const baseHeight = Math.round((safeWidth * 9) / 16);
      const reservedHeight = 96;
      const maxHeight = Math.max(220, safeHeight - reservedHeight);
      this.videoHeight = Math.max(baseHeight, maxHeight);
    },

    /**
     * AI:读取缓存的播放列表并同步当前播放项。
     * @returns {void} AI:无返回值。
     */
    loadPlaylist() {
      const storage = createUniStorage();
      const { list, index } = loadPlayerQueue(storage);
      if (!Array.isArray(list) || list.length === 0) {
        return;
      }
      this.playlist = list;
      if (index >= 0 && index < list.length) {
        this.applyItem(list[index], index);
        return;
      }
      const matchedIndex = list.findIndex(
        (item) => this.resolveItemSource(item) === this.source
      );
      if (matchedIndex >= 0) {
        this.applyItem(list[matchedIndex], matchedIndex);
      }
    },

    /**
     * AI:解析播放条目对应的视频地址。
     * @param {Object} item AI:播放条目。
     * @returns {string} AI:可播放地址。
     */
    resolveItemSource(item) {
      if (!item) {
        return "";
      }
      return item.local_path || item.url || "";
    },

    /**
     * AI:应用播放条目并刷新状态。
     * @param {Object} item AI:播放条目。
     * @param {number} index AI:条目索引。
     * @returns {void} AI:无返回值。
     */
    applyItem(item, index, forcePlay) {
      const src = this.resolveItemSource(item);
      if (!src) {
        this.error = "缺少播放地址";
        return;
      }
      this.source = src;
      this.title = item && item.title ? item.title : "";
      this.error = "";
      this.hasEnded = false;
      if (typeof index === "number") {
        this.currentIndex = index;
        updatePlayerIndex(createUniStorage(), index);
      }
      const shouldPlay = typeof forcePlay === "boolean" ? forcePlay : this.autoPlay;
      if (shouldPlay) {
        this.playNow();
      }
    },

    /**
     * AI:播放上一个视频。
     * @returns {void} AI:无返回值。
     */
    playPrev() {
      if (!this.hasPrev) {
        return;
      }
      const targetIndex = this.currentIndex - 1;
      this.applyItem(this.playlist[targetIndex], targetIndex, true);
    },

    /**
     * AI:播放下一个视频。
     * @returns {void} AI:无返回值。
     */
    playNext() {
      if (!this.hasNext) {
        return;
      }
      const targetIndex = this.currentIndex + 1;
      this.applyItem(this.playlist[targetIndex], targetIndex, true);
    },

    /**
     * AI:处理播放结束事件。
     * @returns {void} AI:无返回值。
     */
    handleEnded() {
      this.hasEnded = true;
    },

    /**
     * AI:处理播放开始事件，重置结束状态。
     * @returns {void} AI:无返回值。
     */
    handlePlay() {
      this.hasEnded = false;
    },

    /**
     * AI:从头重播当前视频。
     * @returns {void} AI:无返回值。
     */
    replay() {
      if (!this.videoContext) {
        this.videoContext = uni.createVideoContext("playerVideo", this);
      }
      this.videoContext.seek(0);
      this.videoContext.play();
      this.hasEnded = false;
    },

    /**
     * AI:自动播放启用时触发播放。
     * @returns {void} AI:无返回值。
     */
    playIfAuto() {
      if (!this.autoPlay || !this.source) {
        return;
      }
      this.playNow();
    },
    /**
     * AI:立即播放当前视频。
     * @returns {void} AI:无返回值。
     */
    playNow() {
      if (!this.source) {
        return;
      }
      this.$nextTick(() => {
        if (!this.videoContext) {
          this.videoContext = uni.createVideoContext("playerVideo", this);
        }
        this.videoContext.play();
      });
    },

    /**
     * AI:返回上一页。
     * @returns {void} AI:无返回值。
     */
    goBack() {
      uni.navigateBack();
    }
  }
};
</script>

<style scoped>
.header {
  display: none;
}

.title {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 0.02em;
  font-family: var(--font-display);
}

.subtitle {
  display: block;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.player-page {
  padding: 12px 0 24px;
}

.video-shell {
  margin-bottom: 16px;
  position: relative;
  background: #000000;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(31, 27, 22, 0.2);
  box-shadow: var(--shadow-float);
}

.video-player {
  width: 100%;
  display: block;
  background: #000000;
}

.replay-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  z-index: 2;
}

.replay-btn {
  padding: 8px 18px;
  border-radius: 999px;
  background: rgba(217, 108, 47, 0.95);
  color: #ffffff;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-align: center;
  min-width: 96px;
}

.actions {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
}

.back {
  min-width: 96px;
  justify-self: center;
}

.prev {
  justify-self: start;
}

.next {
  justify-self: end;
}

.actions .btn[disabled] {
  opacity: 0.45;
}

.error-card {
  margin: 0 16px 16px;
  background: rgba(255, 242, 233, 0.9);
  border: 1px solid rgba(217, 108, 47, 0.25);
}

.error-text {
  color: #b45309;
  font-size: 12px;
}
</style>
