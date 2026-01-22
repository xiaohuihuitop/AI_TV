<template>
  <view class="app-page">
    <view class="header hero">
      <text class="title">{{ title || "播放" }}</text>
      <text class="subtitle muted">视频播放预览</text>
    </view>
    <view v-if="error" class="error-card card">
      <text class="error-text">{{ error }}</text>
    </view>
    <view v-else class="video-shell card">
      <video
        class="video-player"
        :src="source"
        controls
        object-fit="contain"
        :show-fullscreen-btn="false"
      ></video>
    </view>
    <view class="actions">
      <button class="btn btn-ghost back" size="mini" @click="goBack">返回</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      source: "",
      title: "",
      error: ""
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
  },
  /**
   * AI:进入播放页时锁定为横屏展示，便于横向观看。
   * @returns {void} AI:无返回值。
   */
  onShow() {
    // #ifdef APP-PLUS
    if (typeof plus !== "undefined" && plus.screen && plus.screen.lockOrientation) {
      plus.screen.lockOrientation("landscape-primary");
    }
    // #endif
  },
  /**
   * AI:离开播放页后恢复竖屏，避免影响其他页面。
   * @returns {void} AI:无返回值。
   */
  onUnload() {
    // #ifdef APP-PLUS
    if (typeof plus !== "undefined" && plus.screen && plus.screen.lockOrientation) {
      plus.screen.lockOrientation("portrait-primary");
    }
    // #endif
  },
  methods: {

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
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  animation: rise-fade 320ms ease-out both;
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

.video-shell {
  padding: 8px;
  background: rgba(255, 255, 255, 0.95);
}

.video-player {
  width: 100%;
  height: 70vh;
  background: #000000;
  border-radius: 12px;
  box-shadow: 0 12px 24px rgba(31, 27, 22, 0.18);
  object-fit: contain;
}

.actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-start;
}

.back {
  min-width: 96px;
}

.error-card {
  margin-bottom: 16px;
  background: rgba(255, 242, 233, 0.9);
  border: 1px solid rgba(217, 108, 47, 0.25);
}

.error-text {
  color: #b45309;
  font-size: 12px;
}
</style>
