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
  height: 104px;
}

.app-tabbar {
  position: fixed;
  left: 18px;
  right: 18px;
  bottom: calc(12px + env(safe-area-inset-bottom));
  z-index: 50;
  display: flex;
  gap: 8px;
  padding: 8px;
  border-radius: 24px;
  background: rgba(255, 250, 244, 0.96);
  border: 1px solid rgba(146, 64, 14, 0.12);
  box-shadow: 0 18px 34px rgba(92, 49, 19, 0.14);
}

.app-tabbar-item {
  flex: 1;
  min-height: 58px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b4a2f;
  font-size: 18px;
  font-weight: 800;
}

.app-tabbar-item.active {
  color: #fffaf4;
  background: linear-gradient(135deg, #9a4b18 0%, #c77932 100%);
  box-shadow: 0 10px 22px rgba(146, 64, 14, 0.22);
}

.app-tabbar-text {
  line-height: 1;
}
</style>
