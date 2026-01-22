<template>
  <view class="app-page">
    <view class="header">
      <text class="title">{{ title || "播放" }}</text>
      <text class="subtitle muted">视频播放预览</text>
    </view>
    <view v-if="error" class="error-card card">
      <text class="error-text">{{ error }}</text>
    </view>
    <video v-else class="video-player" :src="source" controls></video>
    <view class="actions">
      <button class="back" size="mini" @click="goBack">返回</button>
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

.video-player {
  width: 100%;
  height: 220px;
  background: #000000;
  border-radius: 8px;
}

.actions {
  margin-top: 16px;
}

.back {
  background-color: #1f1b16;
  color: #ffffff;
}

.error-card {
  margin-bottom: 16px;
  border: 1px solid rgba(217, 108, 47, 0.2);
}

.error-text {
  color: #d96c2f;
  font-size: 12px;
}
</style>
