<template>
  <view class="app-page player-page">
    <view class="header hero">
      <text class="title">{{ title || "??" }}</text>
      <text class="subtitle muted">??????</text>
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
        object-fit="contain"
        :show-fullscreen-btn="false"
        :show-center-play-btn="true"
        :show-play-btn="true"
        :style="{ height: `${videoHeight}px` }"
        @ended="handleEnded"
        @play="handlePlay"
      ></video>
    </view>
    <view class="actions">
      <button class="btn btn-ghost back" size="mini" @click="goBack">??</button>
      <button class="btn btn-ghost nav" size="mini" :disabled="!hasPrev" @click="playPrev">
        ???
      </button>
      <button class="btn btn-ghost nav" size="mini" :disabled="!hasNext" @click="playNext">
        ???
      </button>
      <button v-if="hasEnded" class="btn btn-primary replay" size="mini" @click="replay">
        ??
      </button>
    </view>
  </view>
</template>

<script>
import { loadPlayerQueue, updatePlayerIndex } from "../../utils/playerQueue.js";

/**
 * AI:?? uniapp ????????
 * @returns {{get: function(string): (string|undefined), set: function(string, string): void, remove: function(string): void}} AI:????????
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
      playlist: [],
      currentIndex: -1,
      hasEnded: false,
      videoContext: null
    };
  },
  computed: {
    /**
     * AI:????????????
     * @returns {boolean} AI:?????????
     */
    hasPrev() {
      return this.currentIndex > 0;
    },
    /**
     * AI:????????????
     * @returns {boolean} AI:?????????
     */
    hasNext() {
      return this.currentIndex >= 0 && this.currentIndex < this.playlist.length - 1;
    }
  },
  /**
   * AI:???????????????
   * @param {{src?: string, title?: string}} query AI:?????
   * @returns {void} AI:?????
   */
  onLoad(query) {
    const source = query && query.src ? decodeURIComponent(query.src) : "";
    const title = query && query.title ? decodeURIComponent(query.title) : "";
    this.source = source;
    this.title = title;
    this.loadPlaylist();
    if (!this.source) {
      this.error = "??????";
    }
    this.updateVideoSize();
  },
  onReady() {
    this.videoContext = uni.createVideoContext("playerVideo", this);
  },
  methods: {
    /**
     * AI:????????????????????????
     * @returns {void} AI:?????
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
     * AI:??????????????????
     * @returns {void} AI:?????
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
     * AI:??????????????
     * @param {Object} item AI:?????
     * @returns {string} AI:??????
     */
    resolveItemSource(item) {
      if (!item) {
        return "";
      }
      return item.local_path || item.url || "";
    },

    /**
     * AI:????????????
     * @param {Object} item AI:?????
     * @param {number} index AI:?????
     * @returns {void} AI:?????
     */
    applyItem(item, index) {
      const src = this.resolveItemSource(item);
      if (!src) {
        this.error = "??????";
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
    },

    /**
     * AI:????????
     * @returns {void} AI:?????
     */
    playPrev() {
      if (!this.hasPrev) {
        return;
      }
      const targetIndex = this.currentIndex - 1;
      this.applyItem(this.playlist[targetIndex], targetIndex);
    },

    /**
     * AI:????????
     * @returns {void} AI:?????
     */
    playNext() {
      if (!this.hasNext) {
        return;
      }
      const targetIndex = this.currentIndex + 1;
      this.applyItem(this.playlist[targetIndex], targetIndex);
    },

    /**
     * AI:?????????
     * @returns {void} AI:?????
     */
    handleEnded() {
      this.hasEnded = true;
    },

    /**
     * AI:????????????????
     * @returns {void} AI:?????
     */
    handlePlay() {
      this.hasEnded = false;
    },

    /**
     * AI:?????????
     * @returns {void} AI:?????
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
     * AI:??????
     * @returns {void} AI:?????
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
  background: #000000;
}

.video-player {
  width: 100%;
  display: block;
  background: #000000;
}

.actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 16px;
}

.back {
  min-width: 96px;
}

.nav {
  min-width: 88px;
}

.replay {
  min-width: 96px;
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
