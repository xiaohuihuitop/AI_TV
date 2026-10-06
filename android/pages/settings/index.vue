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
      <view class="update-section">
        <view class="update-heading">
          <text class="setting-label">应用更新</text>
          <text class="update-state muted">{{ updateStatusText }}</text>
        </view>
        <text v-if="updateVersion" class="update-version muted">可更新到 {{ updateVersion }}</text>
        <view v-if="showUpdateProgress" class="update-progress">
          <view class="progress-track">
            <view class="progress-value" :style="{ width: `${updateProgress}%` }"></view>
          </view>
          <text class="progress-text">{{ updateProgress }}%</text>
        </view>
        <button class="btn btn-primary update-button" :disabled="updateBusy" @click="handleUpdateAction">
          {{ updateActionText }}
        </button>
        <text v-if="updateHint" class="hint muted">{{ updateHint }}</text>
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

    <view class="settings-section card cache-settings">
      <view class="setting-row">
        <text class="setting-label">自动缓存</text>
        <text class="setting-description muted">打开视频、图片或图文后，App 会自动保存，断网时优先使用本地内容。</text>
      </view>
      <view class="cache-option-row">
        <text class="setting-label">自动缓存内容</text>
        <switch :checked="cacheConfig.enabled" color="#a84616" @change="handleCacheEnabledChange" />
      </view>
      <view class="cache-option-row">
        <text class="setting-label">仅使用 Wi-Fi</text>
        <switch :checked="cacheConfig.wifiOnly" color="#a84616" @change="handleCacheWifiChange" />
      </view>
      <view class="cache-usage-row">
        <view>
          <text class="setting-label">自动缓存占用</text>
          <text class="cache-usage muted">{{ cacheUsageText }}</text>
        </view>
        <button class="btn btn-ghost cache-clear" @click="clearAutoCache">清理缓存</button>
      </view>
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
import {
  checkForUpdate,
  getUpdateState,
  installAvailableUpdate,
  subscribeUpdateState
} from "../../utils/appUpdateManager.js";
import {
  createAppResourceCache,
  createUniStorage as createCacheStorage,
  defaultResourceCacheConfig,
  loadResourceCacheConfig,
  saveResourceCacheConfig
} from "../../utils/resourceCacheRuntime.js";

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
      appVersionText: "读取中…",
      updateState: getUpdateState(),
      unsubscribeUpdateState: null,
      cacheConfig: { ...defaultResourceCacheConfig },
      cacheUsage: { bytes: 0, items: 0, maxBytes: defaultResourceCacheConfig.maxBytes, maxItems: defaultResourceCacheConfig.maxItems }
    };
  },
  computed: {
    visibleIndexUrl() {
      return formatIndexUrlForDisplay(this.indexUrl);
    },
    cacheUsageText() {
      const megabytes = (this.cacheUsage.bytes / 1024 / 1024).toFixed(1);
      const limit = (this.cacheUsage.maxBytes / 1024 / 1024 / 1024).toFixed(1);
      return `${megabytes} MB / ${limit} GB（${this.cacheUsage.items}/${this.cacheUsage.maxItems} 项）`;
    },
    updateBusy() {
      return ["checking", "downloading", "installing"].includes(this.updateState.status);
    },
    updateVersion() {
      return this.updateState.version || (this.updateState.manifest && this.updateState.manifest.version) || "";
    },
    showUpdateProgress() {
      return ["downloading", "installing"].includes(this.updateState.status);
    },
    updateProgress() {
      return Math.max(0, Math.min(100, Number(this.updateState.progress) || 0));
    },
    updateStatusText() {
      const labels = {
        idle: "",
        checking: "正在检查…",
        upToDate: "已是最新版本",
        "up-to-date": "已是最新版本",
        "update-available": "发现新版本",
        downloading: "正在下载…",
        installing: "正在安装…",
        installed: "更新完成",
        cooldown: "已检查过，可稍后重试",
        "blocked-playing": "播放期间不会更新",
        "request-failed": "检查失败",
        "download-failed": "下载失败",
        "install-failed": "安装失败",
        failed: "更新失败"
      };
      return labels[this.updateState.status] || "";
    },
    updateActionText() {
      if (this.updateState.status === "update-available") return "立即更新";
      if (this.updateBusy) return this.updateState.status === "downloading" ? "下载中…" : "处理中…";
      return "检查新版本";
    },
    updateHint() {
      if (this.updateState.error) return this.updateState.error;
      if (this.updateState.status === "installed") return "App 即将重启";
      if (this.updateState.status === "blocked-playing") return "请退出播放页后重试";
      return "";
    }
  },
  onShow() {
    if (typeof uni.hideTabBar === "function") {
      uni.hideTabBar({ animation: false });
    }
    const storage = createUniStorage();
    this.indexUrl = storage.get(indexUrlKey) || defaultIndexUrl;
    this.cacheConfig = loadResourceCacheConfig(createCacheStorage());
    this.refreshCacheUsage();
    this.unsubscribeUpdateState = subscribeUpdateState((state) => {
      this.updateState = state;
    });
    readAppVersion().then((info) => {
      this.appVersionText = formatAppVersion(info);
    });
  },
  onHide() {
    if (this.unsubscribeUpdateState) {
      this.unsubscribeUpdateState();
      this.unsubscribeUpdateState = null;
    }
  },
  onUnload() {
    if (this.unsubscribeUpdateState) {
      this.unsubscribeUpdateState();
      this.unsubscribeUpdateState = null;
    }
  },
  onBackPress() {
    if (!this.showAddressModal) {
      return false;
    }
    this.closeAddressDialog();
    return true;
  },
  methods: {
    handleUpdateAction() {
      if (this.updateState.status === "update-available" && this.updateState.manifest) {
        installAvailableUpdate(this.updateState.manifest).catch(() => {});
        return;
      }
      checkForUpdate().catch(() => {});
    },
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
    },
    refreshCacheUsage() {
      const storage = createCacheStorage();
      this.cacheConfig = loadResourceCacheConfig(storage);
      const service = createAppResourceCache(storage, undefined, this.cacheConfig);
      this.cacheUsage = service.getUsage();
    },
    handleCacheEnabledChange(event) {
      this.cacheConfig = saveResourceCacheConfig(
        { ...this.cacheConfig, enabled: Boolean(event && event.detail && event.detail.value) },
        createCacheStorage()
      );
    },
    handleCacheWifiChange(event) {
      this.cacheConfig = saveResourceCacheConfig(
        { ...this.cacheConfig, wifiOnly: Boolean(event && event.detail && event.detail.value) },
        createCacheStorage()
      );
    },
    clearAutoCache() {
      uni.showModal({
        title: "清理自动缓存",
        content: "只清理自动缓存，不会删除手动离线视频。",
        confirmText: "清理",
        cancelText: "取消",
        confirmColor: "#a84616",
        success: (res) => {
          if (!res.confirm) return;
          const storage = createCacheStorage();
          const service = createAppResourceCache(storage, undefined, this.cacheConfig);
          service.clearAll().then(() => {
            this.refreshCacheUsage();
            uni.showToast({ title: "已清理", icon: "success" });
          }).catch(() => uni.showToast({ title: "清理失败，请重试", icon: "none" }));
        }
      });
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

.cache-settings {
  margin-top: 14px;
}

.setting-description {
  display: block;
  margin-top: 5px;
  font-size: 14px;
  line-height: 1.55;
}

.cache-option-row,
.cache-usage-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border-subtle);
}

.cache-usage {
  display: block;
  margin-top: 5px;
  font-size: 14px;
}

.cache-clear {
  min-width: 96px;
  min-height: var(--control-height);
}

.version-line {
  display: block;
  margin-top: 5px;
  color: var(--color-text);
  font-size: 17px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.update-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border-subtle);
}

.update-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.update-state,
.update-version,
.progress-text {
  font-size: 13px;
  line-height: 1.45;
}

.update-version {
  margin-top: -4px;
}

.update-button {
  width: 100%;
}

.update-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-track {
  flex: 1;
  height: 10px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
}

.progress-value {
  height: 100%;
  border-radius: inherit;
  background: var(--color-accent);
  transition: width 160ms ease;
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
