<template>
  <view class="app-page">
    <view class="header">
      <text class="title">设置</text>
      <text class="subtitle muted">配置清单地址</text>
    </view>
    <view class="card">
      <text class="label muted">清单地址</text>
      <view class="input-placeholder muted">请填写 index.json URL</view>
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

.label {
  font-size: 12px;
}

.input-placeholder {
  margin-top: 8px;
  font-size: 14px;
}
</style>
