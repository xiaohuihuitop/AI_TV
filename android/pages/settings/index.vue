<template>
  <view class="app-page">
    <view class="header hero">
      <text class="title">连接设置</text>
      <text class="subtitle muted">服务器清单地址</text>
    </view>
    <view class="panel">
      <text class="label muted">当前地址</text>
      <text class="current-url">{{ indexUrl }}</text>
      <view class="actions">
        <button class="btn btn-primary save" size="mini" @click="openAddressDialog">
          连接设置
        </button>
        <button class="btn btn-ghost restore" size="mini" @click="restoreDefaultUrl">
          恢复默认
        </button>
        <text class="hint muted">{{ savedHint }}</text>
      </view>
    </view>
    <view v-if="showAddressModal" class="modal-mask" @click="closeAddressDialog">
      <view class="modal-card" @click.stop>
        <text class="modal-title">连接设置</text>
        <text class="modal-label muted">输入服务器清单地址</text>
        <input
          class="modal-input"
          v-model="draftUrl"
          confirm-type="done"
          placeholder="https://tv.xiaohuihuitop.top/public/index.json?user=admin&pass=admin"
        />
        <view class="modal-actions">
          <button class="btn btn-ghost modal-btn" size="mini" @click="closeAddressDialog">
            取消
          </button>
          <button class="btn btn-primary modal-btn" size="mini" @click="confirmAddressDialog">
            保存
          </button>
        </view>
      </view>
    </view>
    <app-tab-bar v-if="!showAddressModal" active="settings" />
  </view>
</template>

<script>
import AppTabBar from "../../components/AppTabBar.vue";
import { defaultIndexUrl } from "../../utils/appConfig.js";

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
  components: {
    AppTabBar
  },
  data() {
    return {
      indexUrl: "",
      savedHint: "",
      showAddressModal: false,
      draftUrl: ""
    };
  },
  onShow() {
    if (typeof uni.hideTabBar === "function") {
      uni.hideTabBar({ animation: false });
    }
    const storage = createUniStorage();
    this.indexUrl = storage.get(indexUrlKey) || defaultIndexUrl;
  },
  methods: {
    /**
     * AI:打开清单地址输入弹窗。
     * @returns {void} AI:无返回值。
     */
    openAddressDialog() {
      this.draftUrl = this.indexUrl || defaultIndexUrl;
      this.showAddressModal = true;
    },
    /**
     * AI:关闭清单地址输入弹窗。
     * @returns {void} AI:无返回值。
     */
    closeAddressDialog() {
      this.showAddressModal = false;
    },
    /**
     * AI:确认清单地址输入。
     * @returns {void} AI:无返回值。
     */
    confirmAddressDialog() {
      const value = String(this.draftUrl || "").trim();
      if (!value) {
        uni.showToast({ title: "地址不能为空", icon: "none" });
        return;
      }
      this.showAddressModal = false;
      this.saveIndexUrl(value, "已保存");
    },
    /**
     * AI:恢复默认清单地址。
     * @returns {void} AI:无返回值。
     */
    restoreDefaultUrl() {
      uni.showModal({
        title: "恢复默认",
        content: "恢复后会使用默认服务器地址。",
        confirmText: "恢复",
        cancelText: "取消",
        confirmColor: "#8a360e",
        success: (res) => {
          if (!res.confirm) {
            return;
          }
          this.saveIndexUrl(defaultIndexUrl, "已恢复默认");
        }
      });
    },
    /**
     * AI:保存清单地址到本地存储。
     * @param {string} value AI:清单地址。
     * @param {string} hint AI:保存后提示。
     * @returns {void} AI:无返回值。
     */
    saveIndexUrl(value, hint) {
      const storage = createUniStorage();
      this.indexUrl = String(value || "").trim();
      storage.set(indexUrlKey, this.indexUrl);
      this.savedHint = hint || "已保存";
      uni.showToast({ title: this.savedHint, icon: "success" });
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
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 0;
  font-family: var(--font-display);
}

.subtitle {
  display: block;
  font-size: 16px;
  letter-spacing: 0;
}

.label {
  font-size: 16px;
  letter-spacing: 0;
}

.current-url {
  display: block;
  margin-top: 12px;
  padding: 14px;
  border: 1px solid rgba(31, 27, 22, 0.16);
  border-radius: var(--radius-soft);
  font-size: 16px;
  line-height: 1.6;
  background: rgba(255, 255, 255, 0.95);
  color: var(--color-text);
  word-break: break-all;
  overflow-wrap: anywhere;
  box-shadow: inset 0 1px 2px rgba(31, 27, 22, 0.08);
}

.actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

.save {
  width: 100%;
  min-width: 0;
  background: linear-gradient(135deg, #8a360e 0%, #c05621 100%);
  border-color: rgba(138, 54, 14, 0.5);
  color: #ffffff;
  box-shadow: 0 10px 22px rgba(138, 54, 14, 0.3);
}

.restore {
  width: 100%;
  min-width: 0;
}

.hint {
  grid-column: 1 / -1;
  width: 100%;
  font-size: 16px;
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(31, 27, 22, 0.48);
}

.modal-card {
  width: 100%;
  max-width: 560px;
  padding: 22px;
  border-radius: var(--radius-card);
  background: #fffaf3;
  border: 1px solid rgba(31, 27, 22, 0.18);
  box-shadow: 0 24px 48px rgba(31, 27, 22, 0.28);
}

.modal-title {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
}

.modal-label {
  display: block;
  margin-top: 8px;
  font-size: 16px;
}

.modal-input {
  margin-top: 14px;
  min-height: 54px;
  padding: 0 14px;
  border-radius: var(--radius-soft);
  border: 1px solid rgba(31, 27, 22, 0.22);
  background: #ffffff;
  color: var(--color-text);
  font-size: 16px;
  line-height: 1.4;
}

.modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 18px;
}

.modal-btn {
  width: 100%;
  min-width: 0;
}

@media (max-width: 359px) {
  .header {
    margin-bottom: 14px;
  }

  .title {
    font-size: 26px;
  }

  .current-url {
    padding: 12px;
    font-size: 15px;
  }

  .modal-mask {
    padding: 12px;
  }

  .modal-card {
    padding: 18px;
  }
}
</style>
