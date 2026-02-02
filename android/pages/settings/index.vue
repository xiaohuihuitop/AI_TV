<template>
  <view class="app-page">
    <view class="header hero">
      <text class="title">设置</text>
      <text class="subtitle muted">清单地址</text>
    </view>
    <view class="panel">
      <text class="label muted">清单地址</text>
      <input class="input" v-model="indexUrl" placeholder="https://.../index.json" />
      <view class="actions">
        <button class="btn btn-primary save" size="mini" @click="saveIndexUrl">保存</button>
        <text class="hint muted">{{ savedHint }}</text>
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
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  animation: rise-fade 320ms ease-out both;
}

.title {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.02em;
  font-family: var(--font-display);
}

.subtitle {
  display: block;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.label {
  font-size: 12px;
  letter-spacing: 0.08em;
}

.input {
  margin-top: 10px;
  padding: 12px 14px;
  border: 1px solid rgba(31, 27, 22, 0.16);
  border-radius: 12px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-text);
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

.save {
  min-width: 96px;
  background: linear-gradient(135deg, #d96c2f 0%, #f2a45f 100%);
  border-color: #d96c2f;
  color: #ffffff;
  box-shadow: 0 10px 22px rgba(217, 108, 47, 0.25);
}

.hint {
  font-size: 12px;
}
</style>
