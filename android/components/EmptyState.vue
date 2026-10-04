<template>
  <view class="empty-state">
    <text class="empty-state-title">{{ title }}</text>
    <text v-if="description" class="empty-state-description muted">{{ description }}</text>
  </view>
</template>

<script>
export default {
  props: {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ""
    }
  }
};
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  padding: 28px 20px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-card);
  background: rgba(255, 255, 255, 0.52);
  text-align: center;
}

.empty-state-title {
  color: var(--color-text);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
}

.empty-state-description {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.6;
}
</style>
