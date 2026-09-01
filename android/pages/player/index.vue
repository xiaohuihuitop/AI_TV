<template>
  <view class="app-page player-page" :class="{ 'is-immersive': isImmersive }">
    <view class="header hero">
      <text class="title">{{ title || "播放" }}</text>
      <text class="subtitle muted">视频播放预览</text>
    </view>
    <view class="video-shell">
      <view class="video-stage" :style="{ height: `${videoHeight}px` }">
        <view v-if="error" class="error-card card">
          <text class="error-text">{{ error }}</text>
        </view>
        <video
          v-else
          class="video-player"
          id="playerVideo"
          :src="source"
          :controls="true"
          :autoplay="autoPlay"
          object-fit="contain"
          :show-fullscreen-btn="false"
          :show-center-play-btn="true"
          :show-play-btn="true"
          @ended="handleEnded"
          @loadedmetadata="handleLoadedMetadata"
          @play="handlePlay"
        ></video>
        <cover-view v-if="hasEnded && !error" class="replay-overlay">
          <cover-view class="replay-btn" @click="replay">重播</cover-view>
        </cover-view>
      </view>
      <view class="immersive-actions">
        <button class="btn btn-ghost nav prev" size="mini" :disabled="!hasPrev" @click="playPrev">
          上一个
        </button>
        <button class="btn btn-ghost back" size="mini" @click="goBack">返回</button>
        <button class="btn btn-ghost nav next" size="mini" :disabled="!hasNext" @click="playNext">
          下一个
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import { loadPlayerQueue, updatePlayerIndex } from "../../utils/playerQueue.js";
import {
  calculateImmersiveVideoHeight,
  calculateVideoHeight,
  getVideoOrientationLock,
  isViewportReadyForOrientation,
  isViewportStable
} from "../../utils/layout.js";
import { createImmersivePlayerController } from "../../utils/immersivePlayer.js";

const ACTION_BAR_HEIGHT = 76;
const IMMERSIVE_TRANSITION_DELAY_MS = 120;

function resolvePlusRuntime() {
  return typeof plus !== "undefined" ? plus : null;
}

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
      isPlaying: false,
      isImmersive: false,
      pendingOrientationLock: "",
      safeBottom: 0,
      immersiveTransitionTimer: null,
      immersiveController: createImmersivePlayerController(resolvePlusRuntime)
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
  onBackPress() {
    this.exitImmersiveMode();
    return false;
  },
  onUnload() {
    this.exitImmersiveMode();
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
      const safeAreaInsets = info.safeAreaInsets || {};
      this.safeBottom = Math.max(0, Number(safeAreaInsets.bottom || 0));
      this.videoHeight = this.isImmersive
        ? calculateImmersiveVideoHeight(height, ACTION_BAR_HEIGHT, this.safeBottom)
        : calculateVideoHeight(width, height);
      if (
        this.isImmersive
      ) {
        const viewportReady =
          this.immersiveTransitionTimer === null && isViewportStable(width, height);
        const orientationReady = isViewportReadyForOrientation(
          width,
          height,
          this.pendingOrientationLock
        );
        this.immersiveController.finishEnter(viewportReady, orientationReady);
      }
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
      this.isPlaying = false;
      this.pendingOrientationLock = "";
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
      this.tryEnterImmersiveMode();
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
      this.pendingOrientationLock = getVideoOrientationLock(safeWidth, safeHeight);
      this.tryEnterImmersiveMode();
    },

    /**
     * AI:播放开始且方向已知时进入页面级沉浸式播放。
     * @returns {void} AI:无返回值。
     */
    tryEnterImmersiveMode() {
      if (!this.isPlaying || !this.pendingOrientationLock) {
        return;
      }
      const entered = this.immersiveController.enter(this.pendingOrientationLock);
      this.isImmersive = entered;
      if (entered) {
        clearTimeout(this.immersiveTransitionTimer);
        this.immersiveTransitionTimer = setTimeout(() => {
          this.immersiveTransitionTimer = null;
          this.updateVideoSize();
        }, IMMERSIVE_TRANSITION_DELAY_MS);
      }
      this.$nextTick(() => this.updateVideoSize());
    },

    /**
     * AI:退出沉浸式状态并恢复系统界面和方向。
     * @returns {void} AI:无返回值。
     */
    exitImmersiveMode() {
      clearTimeout(this.immersiveTransitionTimer);
      this.immersiveTransitionTimer = null;
      this.immersiveController.exit();
      this.isImmersive = false;
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
      this.exitImmersiveMode();
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
  background: #f7f2ea;
}

.player-page.is-immersive {
  width: 100%;
  max-width: none;
  height: 100vh;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #000000;
}

.video-shell {
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-bottom: 16px;
  background: #000000;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(31, 27, 22, 0.32);
  box-shadow: 0 22px 42px rgba(31, 27, 22, 0.26);
}

.is-immersive .video-shell {
  width: 100%;
  height: 100%;
  margin: 0;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.video-stage {
  position: relative;
  flex: 0 0 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000000;
}

.video-player {
  width: 100%;
  height: 100%;
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

.immersive-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin-top: 16px;
  padding: 0;
}

.immersive-actions .btn {
  width: 100%;
  min-width: 0;
  min-height: 56px;
  padding-right: 8px;
  padding-left: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fffaf4;
  background: #343a3f;
  border-color: rgba(255, 255, 255, 0.28);
}

.immersive-actions .back {
  background: #286953;
  border-color: #4b9b84;
}

.is-immersive .immersive-actions {
  flex: 0 0 auto;
  height: calc(76px + env(safe-area-inset-bottom));
  margin: 0;
  padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: #171b1e;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
}

.back,
.prev,
.next {
  justify-self: stretch;
}

.immersive-actions .btn[disabled] {
  opacity: 0.45;
}

.error-card {
  width: calc(100% - 32px);
  margin: 16px;
  box-sizing: border-box;
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

  .player-page.is-immersive {
    padding: 0;
  }
}
</style>
