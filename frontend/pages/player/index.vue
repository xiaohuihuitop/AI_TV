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
        :src="source"
        :controls="true"
        :object-fit="videoFit"
        :show-fullscreen-btn="false"
        :show-center-play-btn="true"
        :show-play-btn="true"
        :style="{ height: `${videoHeight}px` }"
      ></video>
    </view>
    <view class="actions">
      <button class="btn btn-ghost back" size="mini" @click="goBack">返回</button>
      <button
        class="btn mode"
        :class="videoFit === 'contain' ? 'btn-primary' : 'btn-ghost'"
        size="mini"
        @click="setFit('contain')"
      >
        完整
      </button>
      <button
        class="btn mode"
        :class="videoFit === 'cover' ? 'btn-primary' : 'btn-ghost'"
        size="mini"
        @click="setFit('cover')"
      >
        铺满
      </button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      source: "",
      title: "",
      error: "",
      videoHeight: 220,
      videoFit: "cover"
    };
  },
  /**
   * AI:读取页面参数，初始化播放信息。
   * @param {{src?: string, title?: string}} query AI:路由参数。
   * @returns {void} AI:无返回值。
   */
  onLoad(query) {
    const source = query && query.src ? decodeURIComponent(query.src) : "";
    const title = query && query.title ? decodeURIComponent(query.title) : "";
    this.source = source;
    this.title = title;
    if (!source) {
      this.error = "缺少播放地址";
    }
    this.updateVideoSize();
  },
  methods: {
    /**
     * AI:根据显示模式计算视频高度，并为底部按钮留出空间。
     * @returns {void} AI:无返回值。
     */
    updateVideoSize() {
      const info = uni.getSystemInfoSync();
      const width = Number(info.windowWidth || info.screenWidth || 0);
      const height = Number(info.windowHeight || info.screenHeight || 0);
      const safeWidth = Number.isFinite(width) && width > 0 ? width : 360;
      const safeHeight = Number.isFinite(height) && height > 0 ? height : 640;
      const baseHeight = Math.round(safeWidth * 9 / 16);
      const reservedHeight = 96;
      const maxHeight = Math.max(220, safeHeight - reservedHeight);
      if (this.videoFit === "contain") {
        this.videoHeight = Math.min(maxHeight, baseHeight);
        return;
      }
      this.videoHeight = Math.max(baseHeight, maxHeight);
    },

    /**
     * AI:切换显示模式并刷新布局。
     * @param {"contain"|"cover"} mode AI:显示模式。
     * @returns {void} AI:无返回值。
     */
    setFit(mode) {
      if (this.videoFit === mode) {
        return;
      }
      this.videoFit = mode;
      this.updateVideoSize();
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

.mode {
  min-width: 80px;
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
