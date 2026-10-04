<template>
  <view class="app-page settings-page">
    <view class="settings-intro">
      <text class="settings-title">服务器</text>
      <text class="settings-subtitle muted">管理内容清单与连接地址</text>
    </view>

    <view class="settings-section card">
      <view class="setting-row version-row">
        <text class="setting-label muted">当前版本</text>
        <text class="version-line">{{ appVersionText }}</text>
      </view>
      <view class="setting-row address-row">
        <text class="setting-label muted">服务器地址</text>
        <text class="current-url">{{ visibleIndexUrl }}</text>
      </view>
      <view class="actions">
        <button class="btn btn-primary save" @click="openAddressDialog">
          修改地址
        </button>
        <button class="btn btn-ghost restore" @click="restoreDefaultUrl">
          恢复默认
        </button>
      </view>
      <text v-if="savedHint" class="hint muted">{{ savedHint }}</text>
    </view>

    <view v-if="showAddressModal" class="modal-mask" @click="closeAddressDialog">
      <view class="modal-card" @click.stop>
        <text class="modal-title">修改服务器地址</text>
        <text class="modal-label muted">请输入以 index.json 结尾的 HTTP 或 HTTPS 地址</text>
        <input
          class="modal-input"
          v-model="draftUrl"
          confirm-type="done"
          @confirm="confirmAddressDialog"
          placeholder="https://服务器地址/public/index.json?user=...&pass=..."
        />
        <view class="modal-actions">
          <button class="btn btn-ghost modal-btn" @click="closeAddressDialog">
            取消
          </button>
          <button class="btn btn-primary modal-btn" @click="confirmAddressDialog">
            保存地址
          </button>
        </view>
      </view>
    </view>
    <app-tab-bar v-if="!showAddressModal" active="settings" />
  </view>
</template>

<script>
import AppTabBar from "../../components/AppTabBar.vue";
import {
  defaultIndexUrl,
  formatIndexUrlForDisplay,
  validateIndexUrl
} from "../../utils/appConfig.js";
import { formatAppVersion, readAppVersion } from "../../utils/appVersion.js";

function createUniStorage() {
  return {
    get: (key) => uni.getStorageSync(key),
    set: (key, value) => uni.setStorageSync(key, value)
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
      draftUrl: "",
      appVersionText: "读取中…"
    };
  },
  computed: {
    visibleIndexUrl() {
      return formatIndexUrlForDisplay(this.indexUrl);
    }
  },
  onShow() {
    if (typeof uni.hideTabBar === "function") {
      uni.hideTabBar({ animation: false });
    }
    const storage = createUniStorage();
    this.indexUrl = storage.get(indexUrlKey) || defaultIndexUrl;
    readAppVersion().then((info) => {
      this.appVersionText = formatAppVersion(info);
    });
  },
  onBackPress() {
    if (!this.showAddressModal) {
      return false;
    }
    this.closeAddressDialog();
    return true;
  },
  methods: {
    openAddressDialog() {
      this.draftUrl = this.indexUrl || defaultIndexUrl;
      this.showAddressModal = true;
    },
    closeAddressDialog() {
      this.showAddressModal = false;
    },
    confirmAddressDialog() {
      const result = validateIndexUrl(this.draftUrl);
      if (!result.valid) {
        uni.showToast({ title: result.message, icon: "none" });
        return;
      }
      this.showAddressModal = false;
      this.saveIndexUrl(result.value, "地址已保存，请到最新页下拉刷新");
    },
    restoreDefaultUrl() {
      uni.showModal({
        title: "恢复默认",
        content: "恢复后会使用默认服务器地址。",
        confirmText: "恢复",
        cancelText: "取消",
        confirmColor: "#a84616",
        success: (res) => {
          if (res.confirm) {
            this.saveIndexUrl(defaultIndexUrl, "已恢复默认，请到最新页下拉刷新");
          }
        }
      });
    },
    saveIndexUrl(value, hint) {
      const storage = createUniStorage();
      this.indexUrl = String(value || "").trim();
      storage.set(indexUrlKey, this.indexUrl);
      this.savedHint = hint || "已保存";
      uni.showToast({ title: "已保存", icon: "success" });
    }
  }
};
</script>

<style scoped>
.settings-intro {
  margin: 6px 0 14px;
}

.settings-title {
  display: block;
  color: var(--color-text);
  font-size: 24px;
  font-weight: 700;
  font-family: var(--font-display);
}

.settings-subtitle {
  display: block;
  margin-top: 4px;
  font-size: 14px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-row {
  min-width: 0;
}

.setting-label {
  display: block;
  font-size: 14px;
}

.version-line {
  display: block;
  margin-top: 5px;
  color: var(--color-text);
  font-size: 17px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.address-row {
  padding-top: 14px;
  border-top: 1px solid var(--color-border-subtle);
}

.current-url {
  display: block;
  margin-top: 7px;
  color: var(--color-text);
  font-size: 14px;
  line-height: 1.55;
  word-break: break-all;
  overflow-wrap: anywhere;
}

.actions,
.modal-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.save,
.restore,
.modal-btn {
  width: 100%;
}

.hint {
  font-size: 14px;
  line-height: 1.5;
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: rgba(40, 35, 30, 0.38);
}

.modal-card {
  width: 100%;
  max-width: 560px;
  max-height: calc(100vh - 32px - env(safe-area-inset-bottom));
  margin: 0 auto;
  padding: 20px;
  overflow-y: auto;
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-float);
}

.modal-title {
  display: block;
  color: var(--color-text);
  font-size: 20px;
  font-weight: 700;
}

.modal-label {
  display: block;
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.5;
}

.modal-input {
  margin-top: 14px;
  min-height: var(--control-height);
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-soft);
  background: var(--color-bg-soft);
  color: var(--color-text);
  font-size: 15px;
}

.modal-actions {
  margin-top: 16px;
}

@media (max-width: 359px) {
  .modal-mask {
    padding: 12px;
  }

  .modal-card {
    padding: 16px;
  }
}
</style>
