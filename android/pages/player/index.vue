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
        :show-fullscreen-btn="true"
        :show-center-play-btn="true"
        :show-play-btn="true"
        :style="{ height: `${videoHeight}px` }"
        @ended="handleEnded"
        @fullscreenchange="handleFullscreenChange"
        @loadedmetadata="handleLoadedMetadata"
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
import {
  calculateVideoHeight,
  getVideoFullscreenDirection
} from "../../utils/layout.js";

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
      videoContext: null,
      hasRequestedFullscreen: false,
      isFullscreen: false,
      isPlaying: false,
      pendingFullscreenDirection: null
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
  onResize() {
    this.updateVideoSize();
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
      this.videoHeight = calculateVideoHeight(width, height);
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
      this.hasRequestedFullscreen = false;
      this.isPlaying = false;
      this.pendingFullscreenDirection = null;
      this.prepareAutomaticFullscreen(item);
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
      this.isPlaying = true;
      this.tryEnterFullscreen();
    },

    /**
     * AI:在支持元数据事件的平台上记录视频方向。
     * @param {{detail?: {width?: number, height?: number}}} event AI:视频元数据事件。
     * @returns {void} AI:无返回值。
     */
    handleLoadedMetadata(event) {
      const detail = event && event.detail ? event.detail : {};
      this.setFullscreenDirection(detail.width, detail.height);
    },

    /**
     * AI:优先读取清单宽高，缺失时使用封面尺寸判断视频方向。
     * @param {Object} item AI:播放条目。
     * @returns {void} AI:无返回值。
     */
    prepareAutomaticFullscreen(item) {
      const width = Number(item && item.width ? item.width : 0);
      const height = Number(item && item.height ? item.height : 0);
      if (width > 0 && height > 0) {
        this.setFullscreenDirection(width, height);
        return;
      }

      const cover = item && typeof item.cover === "string" ? item.cover.trim() : "";
      if (!cover) {
        return;
      }
      const probedSource = this.source;
      uni.getImageInfo({
        src: cover,
        success: (result) => {
          if (this.source !== probedSource) {
            return;
          }
          this.setFullscreenDirection(result && result.width, result && result.height);
        }
      });
    },

    /**
     * AI:保存当前视频应使用的全屏方向，并在播放器就绪后尝试全屏。
     * @param {number} width AI:视频或封面宽度。
     * @param {number} height AI:视频或封面高度。
     * @returns {void} AI:无返回值。
     */
    setFullscreenDirection(width, height) {
      const safeWidth = Number(width || 0);
      const safeHeight = Number(height || 0);
      if (safeWidth <= 0 || safeHeight <= 0) {
        return;
      }
      this.pendingFullscreenDirection = getVideoFullscreenDirection(safeWidth, safeHeight);
      this.tryEnterFullscreen();
    },

    /**
     * AI:播放开始且方向已知时，仅自动请求一次全屏。
     * @returns {void} AI:无返回值。
     */
    tryEnterFullscreen() {
      if (
        !this.isPlaying ||
        this.pendingFullscreenDirection === null ||
        this.hasRequestedFullscreen ||
        this.isFullscreen
      ) {
        return;
      }

      const direction = this.pendingFullscreenDirection;
      const requestedSource = this.source;
      this.hasRequestedFullscreen = true;
      if (!this.videoContext) {
        this.videoContext = uni.createVideoContext("playerVideo", this);
      }
      try {
        const request = this.videoContext.requestFullScreen({ direction });
        if (request && typeof request.catch === "function") {
          request.catch(() => {
            if (this.source === requestedSource) {
              this.hasRequestedFullscreen = false;
            }
          });
        }
      } catch (error) {
        if (this.source === requestedSource) {
          this.hasRequestedFullscreen = false;
        }
      }
    },

    /**
     * AI:同步原生播放器全屏状态，避免重复发起全屏请求。
     * @param {{detail?: {fullScreen?: boolean}}} event AI:全屏状态事件。
     * @returns {void} AI:无返回值。
     */
    handleFullscreenChange(event) {
      this.isFullscreen = Boolean(event && event.detail && event.detail.fullScreen);
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
  padding: 12px 12px calc(24px + env(safe-area-inset-bottom));
}

.video-shell {
  margin-bottom: 16px;
  position: relative;
  background: #000000;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(31, 27, 22, 0.32);
  box-shadow: 0 22px 42px rgba(31, 27, 22, 0.26);
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
  background: rgba(0, 0, 0, 0.48);
  z-index: 2;
}

.replay-btn {
  padding: 16px 28px;
  border-radius: 999px;
  background: rgba(138, 54, 14, 0.98);
  color: #ffffff;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0;
  text-align: center;
  min-width: 132px;
}

.actions {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 8px;
  padding: 0;
}

.actions .btn {
  width: 100%;
  min-width: 0;
  padding-right: 8px;
  padding-left: 8px;
}

.back,
.prev,
.next {
  justify-self: stretch;
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
  color: #8a360e;
  font-size: 16px;
}

@media (min-width: 600px) {
  .player-page {
    padding-right: 24px;
    padding-left: 24px;
  }
}
</style>
