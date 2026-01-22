<template>
  <view class="app-page">
    <view class="header">
      <text class="title">设置</text>
      <text class="subtitle muted">清单地址</text>
    </view>
    <view class="card">
      <text class="label muted">清单地址</text>
      <input class="input" v-model="indexUrl" placeholder="https://.../index.json" />
      <view class="actions">
        <button class="save" size="mini" @click="saveIndexUrl">保存</button>
        <text class="muted">{{ savedHint }}</text>
      </view>
    </view>
  </view>
</template>

<script>
/**
 * AI:创建 uniapp 存储读写适配器。
 * @returns {{get: function(string): (string|undefined), set: function(string, string): void, remove: function(string): void}} AI:存储读写适配器。
 */
function createUniStorage() {
  return {
    get: (key) => uni.getStorageSync(key),
    set: (key, value) => uni.setStorageSync(key, value),
    remove: (key) => uni.removeStorageSync(key)
  };
}

const indexUrlKey = "index_url";

export default {
  data() {
    return {
      indexUrl: "",
      savedHint: ""
    };
  },
  onShow() {
    const storage = createUniStorage();
    this.indexUrl = storage.get(indexUrlKey) || "";
  },
  methods: {
    /**
     * AI:保存清单地址到本地存储。
     * @returns {void} AI:无返回值。
     */
    saveIndexUrl() {
      const storage = createUniStorage();
      storage.set(indexUrlKey, String(this.indexUrl || "").trim());
      this.savedHint = "已保存";
      uni.showToast({ title: "已保存", icon: "success" });
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

.label {
  font-size: 12px;
}

.input {
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(107, 100, 93, 0.3);
  border-radius: 8px;
  font-size: 14px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.save {
  background: var(--color-accent);
  color: #ffffff;
}
</style>
