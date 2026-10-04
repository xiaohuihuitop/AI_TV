<template>
  <view>
    <view class="app-tabbar-spacer"></view>
    <view class="app-tabbar">
      <view
        v-for="item in tabs"
        :key="item.key"
        class="app-tabbar-item"
        :class="{ active: active === item.key }"
        @click="switchTab(item)"
      >
        <text class="app-tabbar-text">{{ item.text }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    active: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      tabs: [
        { key: "offline", text: "离线", url: "/pages/offline/index" },
        { key: "latest", text: "最新", url: "/pages/latest/index" },
        { key: "settings", text: "设置", url: "/pages/settings/index" }
      ]
    };
  },
  methods: {
    switchTab(item) {
      if (!item || item.key === this.active) {
        return;
      }
      uni.switchTab({ url: item.url });
    }
  }
};
</script>

<style scoped>
.app-tabbar-spacer {
  height: calc(76px + env(safe-area-inset-bottom));
}

.app-tabbar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 50;
  display: flex;
  gap: 0;
  padding: 6px 12px calc(6px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-border-subtle);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 -4px 12px rgba(40, 35, 30, 0.06);
}

.app-tabbar-item {
  flex: 1;
  min-height: 48px;
  border-radius: var(--radius-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-muted);
  font-size: 16px;
  font-weight: 700;
}

.app-tabbar-item.active {
  color: var(--color-accent);
  background: rgba(168, 70, 22, 0.1);
  box-shadow: none;
}

.app-tabbar-text {
  line-height: 1;
}

@media (max-width: 359px) {
  .app-tabbar {
    padding-right: 8px;
    padding-left: 8px;
  }

  .app-tabbar-item {
    min-height: 46px;
    font-size: 15px;
  }
}
</style>
