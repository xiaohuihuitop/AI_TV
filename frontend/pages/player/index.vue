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
      <video class="video-player" :src="source" controls></video>
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
  padding: 12px;
  background: rgba(15, 18, 28, 0.9);
}

.video-player {
  width: 100%;
  height: 220px;
  background: #000000;
  border-radius: 12px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.45);
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
  background: rgba(32, 18, 14, 0.8);
  border: 1px solid rgba(249, 115, 22, 0.3);
}

.error-text {
  color: #f2a56b;
  font-size: 12px;
}
</style>
