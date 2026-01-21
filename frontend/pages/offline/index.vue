<template>
  <view class="app-page">
    <view class="header">
      <text class="title">离线</text>
      <text class="subtitle muted">本地缓存的内容</text>
    </view>
    <view class="columns">
      <view class="column card">
        <text class="column-title">视频</text>
        <view class="placeholder muted">暂无下载</view>
      </view>
      <view class="column card">
        <text class="column-title">图文</text>
        <view class="placeholder muted">暂无下载</view>
      </view>
    </view>
  </view>
</template>

<script>
export default {};
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

.placeholder {
  margin-top: 12px;
  font-size: 12px;
}
</style>
