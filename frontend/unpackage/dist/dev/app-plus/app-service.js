if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global = uni.requireGlobal();
  ArrayBuffer = global.ArrayBuffer;
  Int8Array = global.Int8Array;
  Uint8Array = global.Uint8Array;
  Uint8ClampedArray = global.Uint8ClampedArray;
  Int16Array = global.Int16Array;
  Uint16Array = global.Uint16Array;
  Int32Array = global.Int32Array;
  Uint32Array = global.Uint32Array;
  Float32Array = global.Float32Array;
  Float64Array = global.Float64Array;
  BigInt64Array = global.BigInt64Array;
  BigUint64Array = global.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  function normalizeIndexItems(raw) {
    const items = Array.isArray(raw && raw.items) ? raw.items.slice() : [];
    items.sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || "")));
    return { items };
  }
  function createStorageAdapter(storage) {
    return {
      getJson(key) {
        const value = storage.get(key);
        return value ? JSON.parse(value) : null;
      },
      setJson(key, value) {
        storage.set(key, JSON.stringify(value));
      },
      remove(key) {
        storage.remove(key);
      }
    };
  }
  function createOfflineService(storage, downloader) {
    const key = "download_items";
    function listDownloads() {
      const value = storage.get(key);
      const list = value ? JSON.parse(value) : [];
      return list.map((entry) => normalizeEntry(entry));
    }
    function saveList(list) {
      storage.set(key, JSON.stringify(list));
    }
    async function addDownload(item, onProgress) {
      if (!item || !item.id) {
        throw new Error("缺少下载信息");
      }
      if (!item.url) {
        throw new Error("缺少下载地址");
      }
      const list = listDownloads().filter((entry2) => entry2.id !== item.id);
      const entry = normalizeEntry({
        ...item,
        status: "downloading",
        progress: 0,
        local_path: ""
      });
      list.unshift(entry);
      saveList(list);
      const updateEntry = (updates) => {
        const target = list.find((current) => current.id === item.id);
        if (!target) {
          return;
        }
        Object.assign(target, updates);
        saveList(list);
      };
      const handleProgress = (value) => {
        const progress = normalizeProgress(value);
        updateEntry({ progress, status: "downloading" });
        if (typeof onProgress === "function") {
          onProgress(progress);
        }
      };
      const result = await downloader.download(item.url, handleProgress);
      const saved = await downloader.save(result.tempFilePath);
      updateEntry({
        local_path: saved.savedFilePath,
        downloaded_at: (/* @__PURE__ */ new Date()).toISOString(),
        progress: 100,
        status: "done"
      });
    }
    async function removeDownload(id) {
      const list = listDownloads().filter((entry) => entry.id !== id);
      saveList(list);
    }
    return {
      listDownloads,
      addDownload,
      removeDownload
    };
  }
  function normalizeProgress(value) {
    const progress = Number(value);
    if (!Number.isFinite(progress)) {
      return 0;
    }
    return Math.min(100, Math.max(0, progress));
  }
  function normalizeEntry(entry) {
    const normalized = { ...entry };
    const progress = typeof normalized.progress === "number" ? normalizeProgress(normalized.progress) : normalized.local_path ? 100 : 0;
    const status = normalized.status || (progress >= 100 || normalized.local_path ? "done" : "downloading");
    normalized.progress = progress;
    normalized.status = status;
    return normalized;
  }
  /**
   * AI:读取播放器队列与当前索引。
   * @param {{get: function(string): (string|undefined), set: function(string, string): void}} storage AI:本地存储适配器。
   * @returns {{list: Array, index: number}} AI:播放队列与索引。
   */
  function loadPlayerQueue(storage) {
    const list = parsePlayerQueueList(storage.get("player_queue"));
    const index = parsePlayerQueueIndex(storage.get("player_queue_index"));
    return { list, index };
  }
  /**
   * AI:保存播放器队列与当前索引。
   * @param {{get: function(string): (string|undefined), set: function(string, string): void}} storage AI:本地存储适配器。
   * @param {Array} list AI:播放队列。
   * @param {number} index AI:当前索引。
   * @returns {void} AI:无返回值。
   */
  function savePlayerQueue(storage, list, index) {
    const safeList = Array.isArray(list) ? list : [];
    storage.set("player_queue", JSON.stringify(safeList));
    storage.set("player_queue_index", String(normalizePlayerQueueIndex(index)));
  }
  /**
   * AI:更新播放器队列的当前索引。
   * @param {{get: function(string): (string|undefined), set: function(string, string): void}} storage AI:本地存储适配器。
   * @param {number} index AI:当前索引。
   * @returns {void} AI:无返回值。
   */
  function updatePlayerIndex(storage, index) {
    storage.set("player_queue_index", String(normalizePlayerQueueIndex(index)));
  }
  function parsePlayerQueueList(value) {
    if (!value) {
      return [];
    }
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  function parsePlayerQueueIndex(value) {
    const index = Number(value);
    return Number.isFinite(index) ? index : -1;
  }
  function normalizePlayerQueueIndex(index) {
    const value = Number(index);
    return Number.isFinite(value) ? value : -1;
  }
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  function createUniStorage$2() {
    return {
      get: (key) => uni.getStorageSync(key),
      set: (key, value) => uni.setStorageSync(key, value),
      remove: (key) => uni.removeStorageSync(key)
    };
  }
  function createUniDownloader() {
    return {
      download(url, onProgress) {
        return new Promise((resolve, reject) => {
          const task = uni.downloadFile({
            url,
            success: (res) => {
              if (res.statusCode === 200) {
                resolve({ tempFilePath: res.tempFilePath });
              } else {
                reject(new Error(`下载失败: ${res.statusCode}`));
              }
            },
            fail: (error) => reject(error)
          });
          if (task && typeof task.onProgressUpdate === "function") {
            task.onProgressUpdate((res) => {
              if (typeof onProgress === "function") {
                onProgress(res.progress);
              }
            });
          }
        });
      },
      save(tempFilePath) {
        return new Promise((resolve, reject) => {
          uni.saveFile({
            tempFilePath,
            success: (res) => resolve({ savedFilePath: res.savedFilePath }),
            fail: (error) => reject(error)
          });
        });
      }
    };
  }
  const indexUrlKey$1 = "index_url";
  const indexCacheKey = "index_cache";
  const _sfc_main$7 = {
    data() {
      return {
        loading: false,
        error: "",
        activeType: "video",
        videoItems: [],
        articleItems: []
      };
    },
    computed: {
      /**
       * AI:根据当前类型返回展示列表。
       * @returns {Array} AI:当前展示数据。
       */
      activeItems() {
        return this.activeType === "video" ? this.videoItems : this.articleItems;
      },
      /**
       * AI:返回当前类型标签文本。
       * @returns {string} AI:标签文本。
       */
      activeLabel() {
        return this.activeType === "video" ? "视频" : "图文";
      }
    },
    onShow() {
      this.fetchIndex();
    },
    /**
     * AI:处理下拉刷新触发，拉取最新清单并结束刷新动画。
     * @returns {void} AI:无返回值。
     */
    onPullDownRefresh() {
      if (this.loading) {
        uni.stopPullDownRefresh();
        return;
      }
      Promise.resolve(this.fetchIndex()).catch(() => {
      }).finally(() => {
        uni.stopPullDownRefresh();
      });
    },
    methods: {
      /**
       * AI:切换当前媒体类型。
       * @param {string} type AI:媒体类型。
       * @returns {void} AI:无返回值。
       */
      setActiveType(type) {
        this.activeType = type;
      },
      /**
       * AI:处理条目点击事件，按类型跳转。
       * @param {Object} item AI:条目信息。
       * @param {number} index AI:条目索引。
       * @returns {void} AI:无返回值。
       */
      handleItemClick(item, index) {
        if (item.type === "article") {
          this.openArticle(item);
          return;
        }
        this.openVideo(item, index);
      },
      /**
       * AI:跳转到视频播放页。
       * @param {Object} item AI:视频条目。
       * @param {number} index AI:条目索引。
       * @returns {void} AI:无返回值。
       */
      openVideo(item, index) {
        const src = this.resolveItemSource(item);
        if (!src) {
          uni.showToast({ title: "缺少播放地址", icon: "none" });
          return;
        }
        const storage = createUniStorage$2();
        const queue = Array.isArray(this.videoItems) ? this.videoItems.slice() : [];
        const resolvedIndex = Number.isFinite(index) ? index : queue.findIndex((entry) => entry.id === item.id);
        const safeIndex = resolvedIndex >= 0 ? resolvedIndex : 0;
        savePlayerQueue(storage, queue, safeIndex);
        const title = item.title ? encodeURIComponent(item.title) : "";
        uni.navigateTo({ url: `/pages/player/index?src=${encodeURIComponent(src)}&title=${title}` });
      },
      /**
       * AI:跳转到图文阅读页。
       * @param {Object} item AI:图文条目。
       * @returns {void} AI:无返回值。
       */
      openArticle(item) {
        const src = this.resolveItemSource(item);
        if (!src) {
          uni.showToast({ title: "缺少阅读地址", icon: "none" });
          return;
        }
        const title = item.title ? encodeURIComponent(item.title) : "";
        uni.navigateTo({ url: `/pages/reader/index?src=${encodeURIComponent(src)}&title=${title}` });
      },
      /**
       * AI:解析条目可用地址。
       * @param {Object} item AI:条目信息。
       * @returns {string} AI:可用地址。
       */
      resolveItemSource(item) {
        return item && item.url ? item.url : "";
      },
      /**
       * AI:拉取清单并更新页面数据。
       * @returns {Promise<boolean>} AI:返回 Promise，用于结束加载状态。
       */
      fetchIndex() {
        const storage = createUniStorage$2();
        const adapter = createStorageAdapter(storage);
        const indexUrl = storage.get(indexUrlKey$1);
        if (!indexUrl) {
          this.error = "请在设置中填写清单地址";
          this.videoItems = [];
          this.articleItems = [];
          return Promise.resolve(false);
        }
        this.loading = true;
        this.error = "";
        return new Promise((resolve) => {
          uni.request({
            url: indexUrl,
            success: (res) => {
              if (res.statusCode === 200 && res.data) {
                adapter.setJson(indexCacheKey, res.data);
                this.applyItems(res.data);
                return;
              }
              this.applyCache(adapter);
            },
            fail: () => {
              this.applyCache(adapter);
            },
            complete: () => {
              this.loading = false;
              resolve(true);
            }
          });
        });
      },
      /**
       * AI:将清单数据应用到页面状态。
       * @param {Object} data AI:清单数据。
       * @returns {void} AI:无返回值。
       */
      applyItems(data) {
        const normalized = normalizeIndexItems(data);
        this.videoItems = normalized.items.filter((item) => item.type === "video");
        this.articleItems = normalized.items.filter((item) => item.type === "article");
      },
      /**
       * AI:从缓存恢复清单并更新页面状态。
       * @param {{getJson: function(string): Object|null}} adapter AI:缓存读取适配器。
       * @returns {void} AI:无返回值。
       */
      applyCache(adapter) {
        const cached = adapter.getJson(indexCacheKey);
        if (cached) {
          this.applyItems(cached);
          return;
        }
        this.error = "清单加载失败，请检查网络或地址";
        this.videoItems = [];
        this.articleItems = [];
      },
      /**
       * AI:触发离线下载并写入本地记录。
       * @param {Object} item AI:待下载条目。
       * @returns {void} AI:无返回值。
       */
      addDownload(item) {
        const storage = createUniStorage$2();
        const service = createOfflineService(storage, createUniDownloader());
        service.addDownload(item).then(() => {
          uni.showToast({ title: "已加入离线", icon: "success" });
        }).catch(() => {
          uni.showToast({ title: "下载失败", icon: "none" });
        });
      }
    }
  };
  function _sfc_render$6(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "app-page" }, [
      vue.createElementVNode("view", { class: "header hero" }, [
        vue.createElementVNode("text", { class: "title" }, "最新"),
        vue.createElementVNode("text", { class: "subtitle muted" }, "从清单加载内容")
      ]),
      vue.createElementVNode("view", { class: "media-tabs" }, [
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["media-tab", { active: $data.activeType === "video" }]),
            onClick: _cache[0] || (_cache[0] = ($event) => $options.setActiveType("video"))
          },
          " 视频 ",
          2
          /* CLASS */
        ),
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["media-tab", { active: $data.activeType === "article" }]),
            onClick: _cache[1] || (_cache[1] = ($event) => $options.setActiveType("article"))
          },
          " 图文 ",
          2
          /* CLASS */
        )
      ]),
      $data.error ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "error-card card"
      }, [
        vue.createElementVNode(
          "text",
          { class: "error-text" },
          vue.toDisplayString($data.error),
          1
          /* TEXT */
        )
      ])) : vue.createCommentVNode("v-if", true),
      vue.createElementVNode("view", { class: "columns" }, [
        vue.createElementVNode("view", { class: "column card cinematic-card" }, [
          vue.createElementVNode(
            "text",
            { class: "column-title" },
            vue.toDisplayString($options.activeLabel),
            1
            /* TEXT */
          ),
          $options.activeItems.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "placeholder muted"
          }, "暂无数据")) : vue.createCommentVNode("v-if", true),
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($options.activeItems, (item, index2) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: item.id,
                class: "item item-card",
                style: vue.normalizeStyle({ "--delay": `${index2 * 60}ms` }),
                onClick: ($event) => $options.handleItemClick(item)
              }, [
                vue.createElementVNode("view", { class: "item-main" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "item-title" },
                    vue.toDisplayString(item.title),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode("button", {
                  class: "btn btn-primary download",
                  size: "mini",
                  onClick: vue.withModifiers(($event) => $options.addDownload(item), ["stop"])
                }, " 下载 ", 8, ["onClick"])
              ], 12, ["onClick"]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])
      ]),
      $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "loading muted"
      }, "加载中...")) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const PagesLatestIndex = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["render", _sfc_render$6], ["__scopeId", "data-v-44f675e0"], ["__file", "D:/AI/AI_TV/frontend/pages/latest/index.vue"]]);
  function createUniStorage$1() {
    return {
      get: (key) => uni.getStorageSync(key),
      set: (key, value) => uni.setStorageSync(key, value),
      remove: (key) => uni.removeStorageSync(key)
    };
  }
  function createEmptyDownloader() {
    return {
      download: async () => ({}),
      save: async () => ({})
    };
  }
  function removeLocalFile(filePath) {
    return new Promise((resolve, reject) => {
      if (!filePath) {
        resolve();
        return;
      }
      uni.removeSavedFile({
        filePath,
        success: () => resolve(),
        fail: (error) => reject(error)
      });
    });
  }
  const _sfc_main$6 = {
    data() {
      return {
        activeType: "video",
        videoItems: [],
        articleItems: [],
        refreshTimer: null
      };
    },
    computed: {
      /**
       * AI:根据当前类型返回展示列表。
       * @returns {Array} AI:当前展示数据。
       */
      activeItems() {
        return this.activeType === "video" ? this.videoItems : this.articleItems;
      },
      /**
       * AI:返回当前类型标签文本。
       * @returns {string} AI:标签文本。
       */
      activeLabel() {
        return this.activeType === "video" ? "视频" : "图文";
      }
    },
    onShow() {
      const hasDownloading = this.refreshDownloads();
      if (hasDownloading) {
        this.startProgressWatcher();
      }
    },
    onHide() {
      this.stopProgressWatcher();
    },
    onUnload() {
      this.stopProgressWatcher();
    },
    methods: {
      /**
       * AI:切换当前媒体类型。
       * @param {string} type AI:媒体类型。
       * @returns {void} AI:无返回值。
       */
      setActiveType(type) {
        this.activeType = type;
      },
      /**
       * AI:处理条目点击事件，按类型跳转。
       * @param {Object} item AI:条目信息。
       * @param {number} index AI:条目索引。
       * @returns {void} AI:无返回值。
       */
      handleItemClick(item, index) {
        if (item.type === "article") {
          this.openArticle(item);
          return;
        }
        this.openVideo(item, index);
      },
      /**
       * AI:跳转到视频播放页。
       * @param {Object} item AI:视频条目。
       * @param {number} index AI:条目索引。
       * @returns {void} AI:无返回值。
       */
      openVideo(item, index) {
        const src = this.resolveItemSource(item);
        if (!src) {
          uni.showToast({ title: "尚未下载完成", icon: "none" });
          return;
        }
        const storage = createUniStorage$1();
        const queue = Array.isArray(this.videoItems) ? this.videoItems.filter((entry) => entry.status === "done" && entry.local_path) : [];
        const resolvedIndex = queue.findIndex((entry) => entry.id === item.id);
        const safeIndex = resolvedIndex >= 0 ? resolvedIndex : 0;
        savePlayerQueue(storage, queue, safeIndex);
        const title = item.title ? encodeURIComponent(item.title) : "";
        uni.navigateTo({ url: `/pages/player/index?src=${encodeURIComponent(src)}&title=${title}` });
      },
      /**
       * AI:跳转到图文阅读页。
       * @param {Object} item AI:图文条目。
       * @returns {void} AI:无返回值。
       */
      openArticle(item) {
        const src = this.resolveItemSource(item);
        if (!src) {
          uni.showToast({ title: "尚未下载完成", icon: "none" });
          return;
        }
        const title = item.title ? encodeURIComponent(item.title) : "";
        uni.navigateTo({ url: `/pages/reader/index?src=${encodeURIComponent(src)}&title=${title}` });
      },
      /**
       * AI:解析条目可用地址。
       * @param {Object} item AI:条目信息。
       * @returns {string} AI:可用地址。
       */
      resolveItemSource(item) {
        return item && item.local_path ? item.local_path : "";
      },
      /**
       * AI:加载离线下载列表并渲染。
       * @returns {boolean} AI:是否存在下载中条目。
       */
      refreshDownloads() {
        const storage = createUniStorage$1();
        const service = createOfflineService(storage, createEmptyDownloader());
        const list = service.listDownloads();
        this.videoItems = list.filter((item) => item.type === "video");
        this.articleItems = list.filter((item) => item.type === "article");
        return list.some((item) => item.status !== "done");
      },
      /**
       * AI:启动下载进度刷新定时器。
       * @returns {void} AI:无返回值。
       */
      startProgressWatcher() {
        this.stopProgressWatcher();
        this.refreshTimer = setInterval(() => {
          const hasDownloading = this.refreshDownloads();
          if (!hasDownloading) {
            this.stopProgressWatcher();
          }
        }, 500);
      },
      /**
       * AI:停止下载进度刷新定时器。
       * @returns {void} AI:无返回值。
       */
      stopProgressWatcher() {
        if (!this.refreshTimer) {
          return;
        }
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      },
      /**
       * AI:删除离线记录并清理本地文件。
       * @param {Object} item AI:离线条目。
       * @returns {void} AI:无返回值。
       */
      removeDownload(item) {
        const storage = createUniStorage$1();
        const service = createOfflineService(storage, createEmptyDownloader());
        removeLocalFile(item.local_path).catch(() => null).then(() => service.removeDownload(item.id)).then(() => {
          const hasDownloading = this.refreshDownloads();
          if (!hasDownloading) {
            this.stopProgressWatcher();
          }
          uni.showToast({ title: "已删除", icon: "success" });
        }).catch(() => {
          uni.showToast({ title: "删除失败", icon: "none" });
        });
      }
    }
  };
  function _sfc_render$5(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "app-page" }, [
      vue.createElementVNode("view", { class: "header hero" }, [
        vue.createElementVNode("text", { class: "title" }, "离线"),
        vue.createElementVNode("text", { class: "subtitle muted" }, "本地缓存的内容")
      ]),
      vue.createElementVNode("view", { class: "media-tabs" }, [
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["media-tab", { active: $data.activeType === "video" }]),
            onClick: _cache[0] || (_cache[0] = ($event) => $options.setActiveType("video"))
          },
          " 视频 ",
          2
          /* CLASS */
        ),
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["media-tab", { active: $data.activeType === "article" }]),
            onClick: _cache[1] || (_cache[1] = ($event) => $options.setActiveType("article"))
          },
          " 图文 ",
          2
          /* CLASS */
        )
      ]),
      vue.createElementVNode("view", { class: "columns" }, [
        vue.createElementVNode("view", { class: "column card cinematic-card" }, [
          vue.createElementVNode(
            "text",
            { class: "column-title" },
            vue.toDisplayString($options.activeLabel),
            1
            /* TEXT */
          ),
          $options.activeItems.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "placeholder muted"
          }, "暂无下载")) : vue.createCommentVNode("v-if", true),
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($options.activeItems, (item, index2) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: item.id,
                class: "item item-card",
                style: vue.normalizeStyle({ "--delay": `${index2 * 60}ms` }),
                onClick: ($event) => $options.handleItemClick(item)
              }, [
                vue.createElementVNode("view", { class: "item-main" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "item-title" },
                    vue.toDisplayString(item.title),
                    1
                    /* TEXT */
                  ),
                  item.status !== "done" ? (vue.openBlock(), vue.createElementBlock("view", {
                    key: 0,
                    class: "progress"
                  }, [
                    vue.createElementVNode(
                      "view",
                      {
                        class: "progress-bar",
                        style: vue.normalizeStyle({ width: `${item.progress}%` })
                      },
                      null,
                      4
                      /* STYLE */
                    )
                  ])) : vue.createCommentVNode("v-if", true),
                  item.status !== "done" ? (vue.openBlock(), vue.createElementBlock(
                    "text",
                    {
                      key: 1,
                      class: "progress-text muted"
                    },
                    vue.toDisplayString(item.progress) + "%",
                    1
                    /* TEXT */
                  )) : vue.createCommentVNode("v-if", true)
                ]),
                vue.createElementVNode("button", {
                  class: "btn btn-ghost remove",
                  size: "mini",
                  onClick: vue.withModifiers(($event) => $options.removeDownload(item), ["stop"])
                }, " 删除 ", 8, ["onClick"])
              ], 12, ["onClick"]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])
      ])
    ]);
  }
  const PagesOfflineIndex = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$5], ["__scopeId", "data-v-f97a8d65"], ["__file", "D:/AI/AI_TV/frontend/pages/offline/index.vue"]]);
  function createUniStorage() {
    return {
      get: (key) => uni.getStorageSync(key),
      set: (key, value) => uni.setStorageSync(key, value),
      remove: (key) => uni.removeStorageSync(key)
    };
  }
  const indexUrlKey = "index_url";
  const _sfc_main$5 = {
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
  function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "app-page" }, [
      vue.createElementVNode("view", { class: "header hero" }, [
        vue.createElementVNode("text", { class: "title" }, "设置"),
        vue.createElementVNode("text", { class: "subtitle muted" }, "清单地址")
      ]),
      vue.createElementVNode("view", { class: "panel" }, [
        vue.createElementVNode("text", { class: "label muted" }, "清单地址"),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "input",
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.indexUrl = $event),
            placeholder: "https://.../index.json"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $data.indexUrl]
        ]),
        vue.createElementVNode("view", { class: "actions" }, [
          vue.createElementVNode("button", {
            class: "btn btn-primary save",
            size: "mini",
            onClick: _cache[1] || (_cache[1] = (...args) => $options.saveIndexUrl && $options.saveIndexUrl(...args))
          }, "保存"),
          vue.createElementVNode(
            "text",
            { class: "hint muted" },
            vue.toDisplayString($data.savedHint),
            1
            /* TEXT */
          )
        ])
      ])
    ]);
  }
  const PagesSettingsIndex = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$4], ["__scopeId", "data-v-a11b3e9a"], ["__file", "D:/AI/AI_TV/frontend/pages/settings/index.vue"]]);
  const _sfc_main$4 = {
    data() {
      return {
        source: "",
        title: "",
        error: "",
        videoHeight: 220,
        playlist: [],
        currentIndex: -1,
        hasEnded: false,
        videoContext: null
      };
    },
    computed: {
      hasPrev() {
        return this.currentIndex > 0;
      },
      hasNext() {
        return this.currentIndex >= 0 && this.currentIndex < this.playlist.length - 1;
      }
    },
    onLoad(query) {
      const source = query && query.src ? decodeURIComponent(query.src) : "";
      const title = query && query.title ? decodeURIComponent(query.title) : "";
      this.source = source;
      this.title = title;
      this.loadPlaylist();
      if (!this.source) {
        this.error = "??????";
      }
      this.updateVideoSize();
    },
    onReady() {
      this.videoContext = uni.createVideoContext("playerVideo", this);
    },
    methods: {
      updateVideoSize() {
        const info = uni.getSystemInfoSync();
        const width = Number(info.windowWidth || info.screenWidth || 0);
        const height = Number(info.windowHeight || info.screenHeight || 0);
        const safeWidth = Number.isFinite(width) && width > 0 ? width : 360;
        const safeHeight = Number.isFinite(height) && height > 0 ? height : 640;
        const baseHeight = Math.round(safeWidth * 9 / 16);
        const reservedHeight = 96;
        const maxHeight = Math.max(220, safeHeight - reservedHeight);
        this.videoHeight = Math.max(baseHeight, maxHeight);
      },
      loadPlaylist() {
        const storage = createUniStorage();
        const { list, index } = loadPlayerQueue(storage);
        if (!Array.isArray(list) || list.length === 0) {
          return;
        }
        this.playlist = list;
        if (index >= 0 && index < list.length) {
          this.applyItem(list[index], index);
          return;
        }
        const matchedIndex = list.findIndex((item) => this.resolveItemSource(item) === this.source);
        if (matchedIndex >= 0) {
          this.applyItem(list[matchedIndex], matchedIndex);
        }
      },
      resolveItemSource(item) {
        if (!item) {
          return "";
        }
        return item.local_path || item.url || "";
      },
      applyItem(item, index) {
        const src = this.resolveItemSource(item);
        if (!src) {
          this.error = "??????";
          return;
        }
        this.source = src;
        this.title = item && item.title ? item.title : "";
        this.error = "";
        this.hasEnded = false;
        if (typeof index === "number") {
          this.currentIndex = index;
          updatePlayerIndex(createUniStorage(), index);
        }
      },
      playPrev() {
        if (!this.hasPrev) {
          return;
        }
        const targetIndex = this.currentIndex - 1;
        this.applyItem(this.playlist[targetIndex], targetIndex);
      },
      playNext() {
        if (!this.hasNext) {
          return;
        }
        const targetIndex = this.currentIndex + 1;
        this.applyItem(this.playlist[targetIndex], targetIndex);
      },
      handleEnded() {
        this.hasEnded = true;
      },
      handlePlay() {
        this.hasEnded = false;
      },
      replay() {
        if (!this.videoContext) {
          this.videoContext = uni.createVideoContext("playerVideo", this);
        }
        this.videoContext.seek(0);
        this.videoContext.play();
        this.hasEnded = false;
      },
      goBack() {
        uni.navigateBack();
      }
    }
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "app-page player-page" }, [
      vue.createElementVNode("view", { class: "header hero" }, [
        vue.createElementVNode(
          "text",
          { class: "title" },
          vue.toDisplayString($data.title || "??"),
          1
          /* TEXT */
        ),
        vue.createElementVNode("text", { class: "subtitle muted" }, "??????")
      ]),
      $data.error ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "error-card card"
      }, [
        vue.createElementVNode(
          "text",
          { class: "error-text" },
          vue.toDisplayString($data.error),
          1
          /* TEXT */
        )
      ])) : (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "video-shell"
      }, [
        vue.createElementVNode("video", {
          class: "video-player",
          id: "playerVideo",
          src: $data.source,
          controls: true,
          "object-fit": "contain",
          "show-fullscreen-btn": false,
          "show-center-play-btn": true,
          "show-play-btn": true,
          style: vue.normalizeStyle({ height: `${$data.videoHeight}px` }),
          onEnded: _cache[0] || (_cache[0] = (...args) => $options.handleEnded && $options.handleEnded(...args)),
          onPlay: _cache[1] || (_cache[1] = (...args) => $options.handlePlay && $options.handlePlay(...args))
        }, null, 44, ["src"])
      ])),
      vue.createElementVNode("view", { class: "actions" }, [
        vue.createElementVNode("button", {
          class: "btn btn-ghost back",
          size: "mini",
          onClick: _cache[2] || (_cache[2] = (...args) => $options.goBack && $options.goBack(...args))
        }, "??"),
        vue.createElementVNode("button", {
          class: "btn btn-ghost nav",
          size: "mini",
          disabled: !$options.hasPrev,
          onClick: _cache[3] || (_cache[3] = (...args) => $options.playPrev && $options.playPrev(...args))
        }, "???"),
        vue.createElementVNode("button", {
          class: "btn btn-ghost nav",
          size: "mini",
          disabled: !$options.hasNext,
          onClick: _cache[4] || (_cache[4] = (...args) => $options.playNext && $options.playNext(...args))
        }, "???"),
        $data.hasEnded ? (vue.openBlock(), vue.createElementBlock("button", {
          key: 0,
          class: "btn btn-primary replay",
          size: "mini",
          onClick: _cache[5] || (_cache[5] = (...args) => $options.replay && $options.replay(...args))
        }, "??")) : vue.createCommentVNode("v-if", true)
      ])
    ]);
  }
  const PagesPlayerIndex = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$3], ["__scopeId", "data-v-eb444998"], ["__file", "D:/AI/AI_TV/frontend/pages/player/index.vue"]]);
  const block0 = (Comp) => {
    (Comp.$wxs || (Comp.$wxs = [])).push("handler");
    (Comp.$wxsModules || (Comp.$wxsModules = {}))["handler"] = "2f992f8c";
  };
  const _sfc_main$3 = {
    name: "node",
    options: {},
    data() {
      return {
        ctrl: {},
        nodes: []
      };
    },
    props: {
      name: String,
      attrs: {
        type: Object,
        default() {
          return {};
        }
      },
      childs: Array,
      opts: Array
    },
    watch: {
      childs: {
        handler(nodes) {
          while (this.nodes.length > nodes.length) {
            nodes.push({});
          }
          this.nodes = nodes;
        },
        immediate: true
      }
    },
    components: {},
    mounted() {
      this.$nextTick(() => {
        for (this.root = this.$parent; this.root.$options.name !== "mp-html"; this.root = this.root.$parent)
          ;
      });
      if (this.opts[0]) {
        let i;
        for (i = this.childs.length; i--; ) {
          if (this.childs[i].name === "img")
            break;
        }
        if (i !== -1) {
          this.observer = uni.createIntersectionObserver(this).relativeToViewport({
            top: 500,
            bottom: 500
          });
          this.observer.observe("._img", (res) => {
            if (res.intersectionRatio) {
              this.$set(this.ctrl, "load", 1);
              this.observer.disconnect();
            }
          });
        }
      }
    },
    beforeDestroy() {
      if (this.observer) {
        this.observer.disconnect();
      }
    },
    methods: {
      /**
       * @description 播放视频事件
       * @param {Event} e
       */
      play(e) {
        const i = e.currentTarget.dataset.i;
        const node2 = this.childs[i];
        this.root.$emit("play", {
          source: node2.name,
          attrs: {
            ...node2.attrs,
            src: node2.src[this.ctrl[i] || 0]
          }
        });
      },
      /**
       * @description 音视频其他事件
       * @param {Event} e
       */
      mediaEvent(e) {
        const i = e.currentTarget.dataset.i;
        const node2 = this.childs[i];
        this.root.$emit(e.type, {
          ...e.detail,
          source: node2.name,
          attrs: {
            ...node2.attrs,
            src: node2.src[this.ctrl[i] || 0]
          }
        });
      },
      /**
       * @description 图片点击事件
       * @param {Event} e
       */
      imgTap(e) {
        const node2 = this.childs[e.currentTarget.dataset.i];
        if (node2.a) {
          this.linkTap(node2.a);
          return;
        }
        if (node2.attrs.ignore)
          return;
        node2.attrs.src = node2.attrs.src || node2.attrs["data-src"];
        this.root.$emit("imgtap", node2.attrs);
        if (this.root.previewImg) {
          uni.previewImage({
            current: parseInt(node2.attrs.i),
            urls: this.root.imgList
          });
        }
      },
      /**
       * @description 图片长按
       */
      imgLongTap(e) {
        const attrs = this.childs[e.currentTarget.dataset.i].attrs;
        if (this.opts[3] && !attrs.ignore) {
          uni.showActionSheet({
            itemList: ["保存图片"],
            success: () => {
              const save = (path) => {
                uni.saveImageToPhotosAlbum({
                  filePath: path,
                  success() {
                    uni.showToast({
                      title: "保存成功"
                    });
                  }
                });
              };
              if (this.root.imgList[attrs.i].startsWith("http")) {
                uni.downloadFile({
                  url: this.root.imgList[attrs.i],
                  success: (res) => save(res.tempFilePath)
                });
              } else {
                save(this.root.imgList[attrs.i]);
              }
            }
          });
        }
      },
      /**
       * @description 图片加载完成事件
       * @param {Event} e
       */
      imgLoad(e) {
        const i = e.currentTarget.dataset.i;
        if (!this.childs[i].w) {
          this.$set(this.ctrl, i, e.detail.width);
        } else if (this.opts[1] && !this.ctrl[i] || this.ctrl[i] === -1) {
          this.$set(this.ctrl, i, 1);
        }
        this.checkReady();
      },
      /**
       * @description 检查是否所有图片加载完毕
       */
      checkReady() {
        if (this.root && !this.root.lazyLoad) {
          this.root._unloadimgs -= 1;
          if (!this.root._unloadimgs) {
            setTimeout(() => {
              this.root.getRect().then((rect) => {
                this.root.$emit("ready", rect);
              }).catch(() => {
                this.root.$emit("ready", {});
              });
            }, 350);
          }
        }
      },
      /**
       * @description 链接点击事件
       * @param {Event} e
       */
      linkTap(e) {
        const node2 = e.currentTarget ? this.childs[e.currentTarget.dataset.i] : {};
        const attrs = node2.attrs || e;
        const href = attrs.href;
        this.root.$emit("linktap", Object.assign({
          innerText: this.root.getText(node2.children || [])
          // 链接内的文本内容
        }, attrs));
        if (href) {
          if (href[0] === "#") {
            this.root.navigateTo(href.substring(1)).catch(() => {
            });
          } else if (href.split("?")[0].includes("://")) {
            if (this.root.copyLink) {
              plus.runtime.openWeb(href);
            }
          } else {
            uni.navigateTo({
              url: href,
              fail() {
                uni.switchTab({
                  url: href,
                  fail() {
                  }
                });
              }
            });
          }
        }
      },
      /**
       * @description 错误事件
       * @param {Event} e
       */
      mediaError(e) {
        const i = e.currentTarget.dataset.i;
        const node2 = this.childs[i];
        if (node2.name === "video" || node2.name === "audio") {
          let index2 = (this.ctrl[i] || 0) + 1;
          if (index2 > node2.src.length) {
            index2 = 0;
          }
          if (index2 < node2.src.length) {
            this.$set(this.ctrl, i, index2);
            return;
          }
        } else if (node2.name === "img") {
          if (this.opts[2]) {
            this.$set(this.ctrl, i, -1);
          }
          this.checkReady();
        }
        if (this.root) {
          this.root.$emit("error", {
            source: node2.name,
            attrs: node2.attrs,
            errMsg: e.detail.errMsg
          });
        }
      }
    }
  };
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_node = vue.resolveComponent("node", true);
    return vue.openBlock(), vue.createElementBlock("view", {
      id: $props.attrs.id,
      class: vue.normalizeClass("_block _" + $props.name + " " + $props.attrs.class),
      style: vue.normalizeStyle($props.attrs.style)
    }, [
      (vue.openBlock(true), vue.createElementBlock(
        vue.Fragment,
        null,
        vue.renderList($data.nodes, (n, i) => {
          return vue.openBlock(), vue.createElementBlock(
            vue.Fragment,
            { key: i },
            [
              n.name === "img" && !n.t && ($props.opts[1] && !$data.ctrl[i] || $data.ctrl[i] < 0) ? (vue.openBlock(), vue.createElementBlock("image", {
                key: 0,
                class: "_img",
                style: vue.normalizeStyle(n.attrs.style),
                src: $data.ctrl[i] < 0 ? $props.opts[2] : $props.opts[1],
                mode: "widthFix"
              }, null, 12, ["src"])) : vue.createCommentVNode("v-if", true),
              n.name === "img" && n.t ? (vue.openBlock(), vue.createElementBlock("rich-text", {
                key: 1,
                style: vue.normalizeStyle("display:" + n.t),
                nodes: [{ attrs: { style: n.attrs.style || "", src: n.attrs.src }, name: "img" }],
                "data-i": i,
                onClick: _cache[0] || (_cache[0] = vue.withModifiers((...args) => $options.imgTap && $options.imgTap(...args), ["stop"]))
              }, null, 12, ["nodes", "data-i"])) : n.name === "img" ? (vue.openBlock(), vue.createElementBlock("image", {
                key: 2,
                id: n.attrs.id,
                class: vue.normalizeClass("_img " + n.attrs.class),
                style: vue.normalizeStyle(($data.ctrl[i] === -1 ? "display:none;" : "") + "width:" + ($data.ctrl[i] || 1) + "px;" + n.attrs.style),
                src: n.attrs.src || ($data.ctrl.load ? n.attrs["data-src"] : ""),
                mode: !n.h ? "widthFix" : !n.w ? "heightFix" : n.m || "",
                "data-i": i,
                onLoad: _cache[1] || (_cache[1] = (...args) => $options.imgLoad && $options.imgLoad(...args)),
                onError: _cache[2] || (_cache[2] = (...args) => $options.mediaError && $options.mediaError(...args)),
                onClick: _cache[3] || (_cache[3] = vue.withModifiers((...args) => $options.imgTap && $options.imgTap(...args), ["stop"])),
                onLongpress: _cache[4] || (_cache[4] = (...args) => $options.imgLongTap && $options.imgLongTap(...args))
              }, null, 46, ["id", "src", "mode", "data-i"])) : n.text ? (vue.openBlock(), vue.createElementBlock(
                "text",
                {
                  key: 3,
                  decode: ""
                },
                vue.toDisplayString(n.text),
                1
                /* TEXT */
              )) : n.name === "br" ? (vue.openBlock(), vue.createElementBlock("text", { key: 4 }, vue.toDisplayString("\n"))) : n.name === "a" ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 5,
                id: n.attrs.id,
                class: vue.normalizeClass((n.attrs.href ? "_a " : "") + n.attrs.class),
                "hover-class": "_hover",
                style: vue.normalizeStyle("display:inline;" + n.attrs.style),
                "data-i": i,
                onClick: _cache[5] || (_cache[5] = vue.withModifiers((...args) => $options.linkTap && $options.linkTap(...args), ["stop"]))
              }, [
                vue.createVNode(_component_node, {
                  name: "span",
                  childs: n.children,
                  opts: $props.opts,
                  style: { "display": "inherit" }
                }, null, 8, ["childs", "opts"])
              ], 14, ["id", "data-i"])) : n.html ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 6,
                id: n.attrs.id,
                class: vue.normalizeClass("_video " + n.attrs.class),
                style: vue.normalizeStyle(n.attrs.style),
                innerHTML: n.html,
                "data-i": i,
                onVplay: _cache[6] || (_cache[6] = vue.withModifiers((...args) => $options.play && $options.play(...args), ["stop"]))
              }, null, 46, ["id", "innerHTML", "data-i"])) : n.name === "iframe" ? (vue.openBlock(), vue.createElementBlock("iframe", {
                key: 7,
                style: vue.normalizeStyle(n.attrs.style),
                allowfullscreen: n.attrs.allowfullscreen,
                frameborder: n.attrs.frameborder,
                src: n.attrs.src
              }, null, 12, ["allowfullscreen", "frameborder", "src"])) : n.name === "embed" ? (vue.openBlock(), vue.createElementBlock("embed", {
                key: 8,
                style: vue.normalizeStyle(n.attrs.style),
                src: n.attrs.src
              }, null, 12, ["src"])) : n.name === "table" && n.c || n.name === "li" ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 9,
                id: n.attrs.id,
                class: vue.normalizeClass("_" + n.name + " " + n.attrs.class),
                style: vue.normalizeStyle(n.attrs.style)
              }, [
                n.name === "li" ? (vue.openBlock(), vue.createBlock(_component_node, {
                  key: 0,
                  childs: n.children,
                  opts: $props.opts
                }, null, 8, ["childs", "opts"])) : (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  { key: 1 },
                  vue.renderList(n.children, (tbody, x) => {
                    return vue.openBlock(), vue.createElementBlock(
                      "view",
                      {
                        key: x,
                        class: vue.normalizeClass("_" + tbody.name + " " + tbody.attrs.class),
                        style: vue.normalizeStyle(tbody.attrs.style)
                      },
                      [
                        tbody.name === "td" || tbody.name === "th" ? (vue.openBlock(), vue.createBlock(_component_node, {
                          key: 0,
                          childs: tbody.children,
                          opts: $props.opts
                        }, null, 8, ["childs", "opts"])) : (vue.openBlock(true), vue.createElementBlock(
                          vue.Fragment,
                          { key: 1 },
                          vue.renderList(tbody.children, (tr, y) => {
                            return vue.openBlock(), vue.createElementBlock(
                              vue.Fragment,
                              { key: y },
                              [
                                tr.name === "td" || tr.name === "th" ? (vue.openBlock(), vue.createElementBlock(
                                  "view",
                                  {
                                    key: 0,
                                    class: vue.normalizeClass("_" + tr.name + " " + tr.attrs.class),
                                    style: vue.normalizeStyle(tr.attrs.style)
                                  },
                                  [
                                    vue.createVNode(_component_node, {
                                      childs: tr.children,
                                      opts: $props.opts
                                    }, null, 8, ["childs", "opts"])
                                  ],
                                  6
                                  /* CLASS, STYLE */
                                )) : (vue.openBlock(), vue.createElementBlock(
                                  "view",
                                  {
                                    key: 1,
                                    class: vue.normalizeClass("_" + tr.name + " " + tr.attrs.class),
                                    style: vue.normalizeStyle(tr.attrs.style)
                                  },
                                  [
                                    (vue.openBlock(true), vue.createElementBlock(
                                      vue.Fragment,
                                      null,
                                      vue.renderList(tr.children, (td, z) => {
                                        return vue.openBlock(), vue.createElementBlock(
                                          "view",
                                          {
                                            key: z,
                                            class: vue.normalizeClass("_" + td.name + " " + td.attrs.class),
                                            style: vue.normalizeStyle(td.attrs.style)
                                          },
                                          [
                                            vue.createVNode(_component_node, {
                                              childs: td.children,
                                              opts: $props.opts
                                            }, null, 8, ["childs", "opts"])
                                          ],
                                          6
                                          /* CLASS, STYLE */
                                        );
                                      }),
                                      128
                                      /* KEYED_FRAGMENT */
                                    ))
                                  ],
                                  6
                                  /* CLASS, STYLE */
                                ))
                              ],
                              64
                              /* STABLE_FRAGMENT */
                            );
                          }),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ],
                      6
                      /* CLASS, STYLE */
                    );
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ], 14, ["id"])) : !n.c ? (vue.openBlock(), vue.createElementBlock("rich-text", {
                key: 10,
                id: n.attrs.id,
                style: vue.normalizeStyle("display:inline;" + n.f),
                preview: false,
                selectable: $props.opts[4],
                "user-select": $props.opts[4],
                nodes: [n]
              }, null, 12, ["id", "selectable", "user-select", "nodes"])) : n.c === 2 ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 11,
                id: n.attrs.id,
                class: vue.normalizeClass("_block _" + n.name + " " + n.attrs.class),
                style: vue.normalizeStyle(n.f + ";" + n.attrs.style)
              }, [
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList(n.children, (n2, j) => {
                    return vue.openBlock(), vue.createBlock(_component_node, {
                      key: j,
                      style: vue.normalizeStyle(n2.f),
                      name: n2.name,
                      attrs: n2.attrs,
                      childs: n2.children,
                      opts: $props.opts
                    }, null, 8, ["style", "name", "attrs", "childs", "opts"]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ], 14, ["id"])) : (vue.openBlock(), vue.createBlock(_component_node, {
                key: 12,
                style: vue.normalizeStyle(n.f),
                name: n.name,
                attrs: n.attrs,
                childs: n.children,
                opts: $props.opts
              }, null, 8, ["style", "name", "attrs", "childs", "opts"]))
            ],
            64
            /* STABLE_FRAGMENT */
          );
        }),
        128
        /* KEYED_FRAGMENT */
      ))
    ], 14, ["id"]);
  }
  if (typeof block0 === "function")
    block0(_sfc_main$3);
  const node = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__scopeId", "data-v-8845ff2f"], ["__file", "D:/AI/AI_TV/frontend/uni_modules/mp-html/components/mp-html/node/node.vue"]]);
  const config = {
    // 信任的标签（保持标签名不变）
    trustTags: makeMap("a,abbr,ad,audio,b,blockquote,br,code,col,colgroup,dd,del,dl,dt,div,em,fieldset,h1,h2,h3,h4,h5,h6,hr,i,img,ins,label,legend,li,ol,p,q,ruby,rt,source,span,strong,sub,sup,table,tbody,td,tfoot,th,thead,tr,title,ul,video"),
    // 块级标签（转为 div，其他的非信任标签转为 span）
    blockTags: makeMap("address,article,aside,body,caption,center,cite,footer,header,html,nav,pre,section"),
    // 行内标签
    inlineTags: makeMap("abbr,b,big,code,del,em,i,ins,label,q,small,span,strong,sub,sup"),
    // 要移除的标签
    ignoreTags: makeMap("area,base,canvas,embed,frame,head,iframe,input,link,map,meta,param,rp,script,source,style,textarea,title,track,wbr"),
    // 自闭合的标签
    voidTags: makeMap("area,base,br,col,circle,ellipse,embed,frame,hr,img,input,line,link,meta,param,path,polygon,rect,source,track,use,wbr"),
    // html 实体
    entities: {
      lt: "<",
      gt: ">",
      quot: '"',
      apos: "'",
      ensp: " ",
      emsp: " ",
      nbsp: " ",
      semi: ";",
      ndash: "–",
      mdash: "—",
      middot: "·",
      lsquo: "‘",
      rsquo: "’",
      ldquo: "“",
      rdquo: "”",
      bull: "•",
      hellip: "…",
      larr: "←",
      uarr: "↑",
      rarr: "→",
      darr: "↓"
    },
    // 默认的标签样式
    tagStyle: {
      address: "font-style:italic",
      big: "display:inline;font-size:1.2em",
      caption: "display:table-caption;text-align:center",
      center: "text-align:center",
      cite: "font-style:italic",
      dd: "margin-left:40px",
      mark: "background-color:yellow",
      pre: "font-family:monospace;white-space:pre",
      s: "text-decoration:line-through",
      small: "display:inline;font-size:0.8em",
      strike: "text-decoration:line-through",
      u: "text-decoration:underline"
    },
    // svg 大小写对照表
    svgDict: {
      animatetransform: "animateTransform",
      lineargradient: "linearGradient",
      viewbox: "viewBox",
      attributename: "attributeName",
      repeatcount: "repeatCount",
      repeatdur: "repeatDur",
      foreignobject: "foreignObject"
    }
  };
  const tagSelector = {};
  let windowWidth;
  const systemInfo = uni.getSystemInfoSync();
  windowWidth = systemInfo.windowWidth;
  const blankChar = makeMap(" ,\r,\n,	,\f");
  let idIndex = 0;
  config.ignoreTags.iframe = void 0;
  config.trustTags.iframe = true;
  config.ignoreTags.embed = void 0;
  config.trustTags.embed = true;
  function makeMap(str) {
    const map = /* @__PURE__ */ Object.create(null);
    const list = str.split(",");
    for (let i = list.length; i--; ) {
      map[list[i]] = true;
    }
    return map;
  }
  function decodeEntity(str, amp) {
    let i = str.indexOf("&");
    while (i !== -1) {
      const j = str.indexOf(";", i + 3);
      let code;
      if (j === -1)
        break;
      if (str[i + 1] === "#") {
        code = parseInt((str[i + 2] === "x" ? "0" : "") + str.substring(i + 2, j));
        if (!isNaN(code)) {
          str = str.substr(0, i) + String.fromCharCode(code) + str.substr(j + 1);
        }
      } else {
        code = str.substring(i + 1, j);
        if (config.entities[code] || code === "amp" && amp) {
          str = str.substr(0, i) + (config.entities[code] || "&") + str.substr(j + 1);
        }
      }
      i = str.indexOf("&", i + 1);
    }
    return str;
  }
  function mergeNodes(nodes) {
    let i = nodes.length - 1;
    for (let j = i; j >= -1; j--) {
      if (j === -1 || nodes[j].c || !nodes[j].name || nodes[j].name !== "div" && nodes[j].name !== "p" && nodes[j].name[0] !== "h" || (nodes[j].attrs.style || "").includes("inline")) {
        if (i - j >= 5) {
          nodes.splice(j + 1, i - j, {
            name: "div",
            attrs: {},
            children: nodes.slice(j + 1, i + 1)
          });
        }
        i = j - 1;
      }
    }
  }
  function Parser(vm) {
    this.options = vm || {};
    this.tagStyle = Object.assign({}, config.tagStyle, this.options.tagStyle);
    this.imgList = vm.imgList || [];
    this.imgList._unloadimgs = 0;
    this.plugins = vm.plugins || [];
    this.attrs = /* @__PURE__ */ Object.create(null);
    this.stack = [];
    this.nodes = [];
    this.pre = (this.options.containerStyle || "").includes("white-space") && this.options.containerStyle.includes("pre") ? 2 : 0;
  }
  Parser.prototype.parse = function(content) {
    for (let i = this.plugins.length; i--; ) {
      if (this.plugins[i].onUpdate) {
        content = this.plugins[i].onUpdate(content, config) || content;
      }
    }
    new Lexer(this).parse(content);
    while (this.stack.length) {
      this.popNode();
    }
    if (this.nodes.length > 50) {
      mergeNodes(this.nodes);
    }
    return this.nodes;
  };
  Parser.prototype.expose = function() {
    for (let i = this.stack.length; i--; ) {
      const item = this.stack[i];
      if (item.c || item.name === "a" || item.name === "video" || item.name === "audio")
        return;
      item.c = 1;
    }
  };
  Parser.prototype.hook = function(node2) {
    for (let i = this.plugins.length; i--; ) {
      if (this.plugins[i].onParse && this.plugins[i].onParse(node2, this) === false) {
        return false;
      }
    }
    return true;
  };
  Parser.prototype.getUrl = function(url) {
    const domain = this.options.domain;
    if (url[0] === "/") {
      if (url[1] === "/") {
        url = (domain ? domain.split("://")[0] : "http") + ":" + url;
      } else if (domain) {
        url = domain + url;
      } else {
        url = plus.io.convertLocalFileSystemURL(url);
      }
    } else if (!url.includes("data:") && !url.includes("://")) {
      if (domain) {
        url = domain + "/" + url;
      } else {
        url = plus.io.convertLocalFileSystemURL(url);
      }
    }
    return url;
  };
  Parser.prototype.parseStyle = function(node2) {
    const attrs = node2.attrs;
    const list = (this.tagStyle[node2.name] || "").split(";").concat((attrs.style || "").split(";"));
    const styleObj = {};
    let tmp = "";
    if (attrs.id && !this.xml) {
      if (this.options.useAnchor) {
        this.expose();
      } else if (node2.name !== "img" && node2.name !== "a" && node2.name !== "video" && node2.name !== "audio") {
        attrs.id = void 0;
      }
    }
    if (attrs.width) {
      styleObj.width = parseFloat(attrs.width) + (attrs.width.includes("%") ? "%" : "px");
      attrs.width = void 0;
    }
    if (attrs.height) {
      styleObj.height = parseFloat(attrs.height) + (attrs.height.includes("%") ? "%" : "px");
      attrs.height = void 0;
    }
    for (let i = 0, len = list.length; i < len; i++) {
      const info = list[i].split(":");
      if (info.length < 2)
        continue;
      const key = info.shift().trim().toLowerCase();
      let value = info.join(":").trim();
      if (value[0] === "-" && value.lastIndexOf("-") > 0 || value.includes("safe")) {
        tmp += `;${key}:${value}`;
      } else if (!styleObj[key] || value.includes("import") || !styleObj[key].includes("import")) {
        if (value.includes("url")) {
          let j = value.indexOf("(") + 1;
          if (j) {
            while (value[j] === '"' || value[j] === "'" || blankChar[value[j]]) {
              j++;
            }
            value = value.substr(0, j) + this.getUrl(value.substr(j));
          }
        } else if (value.includes("rpx")) {
          value = value.replace(/[0-9.]+\s*rpx/g, ($) => parseFloat($) * windowWidth / 750 + "px");
        }
        styleObj[key] = value;
      }
    }
    node2.attrs.style = tmp;
    return styleObj;
  };
  Parser.prototype.onTagName = function(name) {
    this.tagName = this.xml ? name : name.toLowerCase();
    if (this.tagName === "svg") {
      this.xml = (this.xml || 0) + 1;
      config.ignoreTags.style = void 0;
    }
  };
  Parser.prototype.onAttrName = function(name) {
    name = this.xml ? name : name.toLowerCase();
    if (name.includes("?") || name.includes(";")) {
      this.attrName = void 0;
      return;
    }
    if (name.substr(0, 5) === "data-") {
      if (name === "data-src" && !this.attrs.src) {
        this.attrName = "src";
      } else if (this.tagName === "img" || this.tagName === "a") {
        this.attrName = name;
      } else {
        this.attrName = void 0;
      }
    } else {
      this.attrName = name;
      this.attrs[name] = "T";
    }
  };
  Parser.prototype.onAttrVal = function(val) {
    const name = this.attrName || "";
    if (name === "style" || name === "href") {
      this.attrs[name] = decodeEntity(val, true);
    } else if (name.includes("src")) {
      this.attrs[name] = this.getUrl(decodeEntity(val, true));
    } else if (name) {
      this.attrs[name] = val;
    }
  };
  Parser.prototype.onOpenTag = function(selfClose) {
    const node2 = /* @__PURE__ */ Object.create(null);
    node2.name = this.tagName;
    node2.attrs = this.attrs;
    if (this.options.nodes.length) {
      node2.type = "node";
    }
    this.attrs = /* @__PURE__ */ Object.create(null);
    const attrs = node2.attrs;
    const parent = this.stack[this.stack.length - 1];
    const siblings = parent ? parent.children : this.nodes;
    const close = this.xml ? selfClose : config.voidTags[node2.name];
    if (tagSelector[node2.name]) {
      attrs.class = tagSelector[node2.name] + (attrs.class ? " " + attrs.class : "");
    }
    if (node2.name === "embed") {
      this.expose();
    }
    if (node2.name === "video" || node2.name === "audio") {
      if (node2.name === "video" && !attrs.id) {
        attrs.id = "v" + idIndex++;
      }
      if (!attrs.controls && !attrs.autoplay) {
        attrs.controls = "T";
      }
      node2.src = [];
      if (attrs.src) {
        node2.src.push(attrs.src);
        attrs.src = void 0;
      }
      this.expose();
    }
    if (close) {
      if (!this.hook(node2) || config.ignoreTags[node2.name]) {
        if (node2.name === "base" && !this.options.domain) {
          this.options.domain = attrs.href;
        } else if (node2.name === "source" && parent && (parent.name === "video" || parent.name === "audio") && attrs.src) {
          parent.src.push(attrs.src);
        }
        return;
      }
      const styleObj = this.parseStyle(node2);
      if (node2.name === "img") {
        if (attrs.src) {
          if (attrs.src.includes("webp")) {
            node2.webp = "T";
          }
          if (attrs.src.includes("data:") && this.options.previewImg !== "all" && !attrs["original-src"]) {
            attrs.ignore = "T";
          }
          if (!attrs.ignore || node2.webp || attrs.src.includes("cloud://")) {
            for (let i = this.stack.length; i--; ) {
              const item = this.stack[i];
              if (item.name === "a") {
                node2.a = item.attrs;
              }
              if (item.name === "table" && !node2.webp && !attrs.src.includes("cloud://")) {
                if (!styleObj.display || styleObj.display.includes("inline")) {
                  node2.t = "inline-block";
                } else {
                  node2.t = styleObj.display;
                }
                styleObj.display = void 0;
              }
              item.c = 1;
            }
            attrs.i = this.imgList.length.toString();
            let src = attrs["original-src"] || attrs.src;
            this.imgList.push(src);
            if (!node2.t) {
              this.imgList._unloadimgs += 1;
            }
            if (this.options.lazyLoad) {
              attrs["data-src"] = attrs.src;
              attrs.src = void 0;
            }
          }
        }
        if (styleObj.display === "inline") {
          styleObj.display = "";
        }
        if (attrs.ignore) {
          styleObj["max-width"] = styleObj["max-width"] || "100%";
          attrs.style += ";-webkit-touch-callout:none";
        }
        if (parseInt(styleObj.width) > windowWidth) {
          styleObj.height = void 0;
        }
        if (!isNaN(parseInt(styleObj.width))) {
          node2.w = "T";
        }
        if (!isNaN(parseInt(styleObj.height)) && (!styleObj.height.includes("%") || parent && (parent.attrs.style || "").includes("height"))) {
          node2.h = "T";
        }
        if (node2.w && node2.h && styleObj["object-fit"]) {
          if (styleObj["object-fit"] === "contain") {
            node2.m = "aspectFit";
          } else if (styleObj["object-fit"] === "cover") {
            node2.m = "aspectFill";
          }
        }
      } else if (node2.name === "svg") {
        siblings.push(node2);
        this.stack.push(node2);
        this.popNode();
        return;
      }
      for (const key in styleObj) {
        if (styleObj[key]) {
          attrs.style += `;${key}:${styleObj[key].replace(" !important", "")}`;
        }
      }
      attrs.style = attrs.style.substr(1) || void 0;
    } else {
      if ((node2.name === "pre" || (attrs.style || "").includes("white-space") && attrs.style.includes("pre")) && this.pre !== 2) {
        this.pre = node2.pre = 1;
      }
      node2.children = [];
      this.stack.push(node2);
    }
    siblings.push(node2);
  };
  Parser.prototype.onCloseTag = function(name) {
    name = this.xml ? name : name.toLowerCase();
    let i;
    for (i = this.stack.length; i--; ) {
      if (this.stack[i].name === name)
        break;
    }
    if (i !== -1) {
      while (this.stack.length > i) {
        this.popNode();
      }
    } else if (name === "p" || name === "br") {
      const siblings = this.stack.length ? this.stack[this.stack.length - 1].children : this.nodes;
      siblings.push({
        name,
        attrs: {
          class: tagSelector[name] || "",
          style: this.tagStyle[name] || ""
        }
      });
    }
  };
  Parser.prototype.popNode = function() {
    const node2 = this.stack.pop();
    let attrs = node2.attrs;
    const children = node2.children;
    const parent = this.stack[this.stack.length - 1];
    const siblings = parent ? parent.children : this.nodes;
    if (!this.hook(node2) || config.ignoreTags[node2.name]) {
      if (node2.name === "title" && children.length && children[0].type === "text" && this.options.setTitle) {
        uni.setNavigationBarTitle({
          title: children[0].text
        });
      }
      siblings.pop();
      return;
    }
    if (node2.pre && this.pre !== 2) {
      this.pre = node2.pre = void 0;
      for (let i = this.stack.length; i--; ) {
        if (this.stack[i].pre) {
          this.pre = 1;
        }
      }
    }
    const styleObj = {};
    if (node2.name === "svg") {
      if (this.xml > 1) {
        this.xml--;
        return;
      }
      let src = "";
      const style = attrs.style;
      attrs.style = "";
      attrs.xmlns = "http://www.w3.org/2000/svg";
      (function traversal(node3) {
        if (node3.type === "text") {
          src += node3.text;
          return;
        }
        const name = config.svgDict[node3.name] || node3.name;
        if (name === "foreignObject") {
          for (const child of node3.children || []) {
            if (child.attrs && !child.attrs.xmlns) {
              child.attrs.xmlns = "http://www.w3.org/1999/xhtml";
              break;
            }
          }
        }
        src += "<" + name;
        for (const item in node3.attrs) {
          const val = node3.attrs[item];
          if (val) {
            src += ` ${config.svgDict[item] || item}="${val.replace(/"/g, "")}"`;
          }
        }
        if (!node3.children) {
          src += "/>";
        } else {
          src += ">";
          for (let i = 0; i < node3.children.length; i++) {
            traversal(node3.children[i]);
          }
          src += "</" + name + ">";
        }
      })(node2);
      node2.name = "img";
      node2.attrs = {
        src: "data:image/svg+xml;utf8," + src.replace(/#/g, "%23"),
        style,
        ignore: "T"
      };
      node2.children = void 0;
      this.xml = false;
      config.ignoreTags.style = true;
      return;
    }
    if (attrs.align) {
      if (node2.name === "table") {
        if (attrs.align === "center") {
          styleObj["margin-inline-start"] = styleObj["margin-inline-end"] = "auto";
        } else {
          styleObj.float = attrs.align;
        }
      } else {
        styleObj["text-align"] = attrs.align;
      }
      attrs.align = void 0;
    }
    if (attrs.dir) {
      styleObj.direction = attrs.dir;
      attrs.dir = void 0;
    }
    if (node2.name === "font") {
      if (attrs.color) {
        styleObj.color = attrs.color;
        attrs.color = void 0;
      }
      if (attrs.face) {
        styleObj["font-family"] = attrs.face;
        attrs.face = void 0;
      }
      if (attrs.size) {
        let size = parseInt(attrs.size);
        if (!isNaN(size)) {
          if (size < 1) {
            size = 1;
          } else if (size > 7) {
            size = 7;
          }
          styleObj["font-size"] = ["x-small", "small", "medium", "large", "x-large", "xx-large", "xxx-large"][size - 1];
        }
        attrs.size = void 0;
      }
    }
    if ((attrs.class || "").includes("align-center")) {
      styleObj["text-align"] = "center";
    }
    Object.assign(styleObj, this.parseStyle(node2));
    if (node2.name !== "table" && parseInt(styleObj.width) > windowWidth) {
      styleObj["max-width"] = "100%";
      styleObj["box-sizing"] = "border-box";
    }
    if (config.blockTags[node2.name]) {
      node2.name = "div";
    } else if (!config.trustTags[node2.name] && !this.xml) {
      node2.name = "span";
    }
    if (node2.name === "a" || node2.name === "ad" || node2.name === "iframe") {
      this.expose();
    } else if (node2.name === "video") {
      if ((styleObj.height || "").includes("auto")) {
        styleObj.height = void 0;
      }
      let str = '<video style="width:100%;height:100%"';
      for (const item in attrs) {
        if (attrs[item]) {
          str += " " + item + '="' + attrs[item] + '"';
        }
      }
      if (this.options.pauseVideo) {
        str += ` onplay="this.dispatchEvent(new CustomEvent('vplay',{bubbles:!0}));for(var e=document.getElementsByTagName('video'),t=0;t<e.length;t++)e[t]!=this&&e[t].pause()"`;
      }
      str += ">";
      for (let i = 0; i < node2.src.length; i++) {
        str += '<source src="' + node2.src[i] + '">';
      }
      str += "</video>";
      node2.html = str;
    } else if ((node2.name === "ul" || node2.name === "ol") && node2.c) {
      const types = {
        a: "lower-alpha",
        A: "upper-alpha",
        i: "lower-roman",
        I: "upper-roman"
      };
      if (types[attrs.type]) {
        attrs.style += ";list-style-type:" + types[attrs.type];
        attrs.type = void 0;
      }
      for (let i = children.length; i--; ) {
        if (children[i].name === "li") {
          children[i].c = 1;
        }
      }
    } else if (node2.name === "table") {
      let padding = parseFloat(attrs.cellpadding);
      let spacing = parseFloat(attrs.cellspacing);
      const border = parseFloat(attrs.border);
      const bordercolor = styleObj["border-color"];
      const borderstyle = styleObj["border-style"];
      if (node2.c) {
        if (isNaN(padding)) {
          padding = 2;
        }
        if (isNaN(spacing)) {
          spacing = 2;
        }
      }
      if (border) {
        attrs.style += `;border:${border}px ${borderstyle || "solid"} ${bordercolor || "gray"}`;
      }
      if (node2.flag && node2.c) {
        styleObj.display = "grid";
        if (styleObj["border-collapse"] === "collapse") {
          styleObj["border-collapse"] = void 0;
          spacing = 0;
        }
        if (spacing) {
          styleObj["grid-gap"] = spacing + "px";
          styleObj.padding = spacing + "px";
        } else if (border) {
          attrs.style += ";border-left:0;border-top:0";
        }
        const width = [];
        const trList = [];
        const cells = [];
        const map = {};
        (function traversal(nodes) {
          for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].name === "tr") {
              trList.push(nodes[i]);
            } else if (nodes[i].name === "colgroup") {
              let colI = 1;
              for (const col of nodes[i].children || []) {
                if (col.name === "col") {
                  const style = col.attrs.style || "";
                  const start = style.indexOf("width") ? style.indexOf(";width") : 0;
                  if (start !== -1) {
                    let end = style.indexOf(";", start + 6);
                    if (end === -1) {
                      end = style.length;
                    }
                    width[colI] = style.substring(start ? start + 7 : 6, end);
                  }
                  colI += 1;
                }
              }
            } else {
              traversal(nodes[i].children || []);
            }
          }
        })(children);
        for (let row = 1; row <= trList.length; row++) {
          let col = 1;
          for (let j = 0; j < trList[row - 1].children.length; j++) {
            const td = trList[row - 1].children[j];
            if (td.name === "td" || td.name === "th") {
              while (map[row + "." + col]) {
                col++;
              }
              let style = td.attrs.style || "";
              let start = style.indexOf("width") ? style.indexOf(";width") : 0;
              if (start !== -1) {
                let end = style.indexOf(";", start + 6);
                if (end === -1) {
                  end = style.length;
                }
                if (!td.attrs.colspan) {
                  width[col] = style.substring(start ? start + 7 : 6, end);
                }
                style = style.substr(0, start) + style.substr(end);
              }
              style += ";display:flex";
              start = style.indexOf("vertical-align");
              if (start !== -1) {
                const val = style.substr(start + 15, 10);
                if (val.includes("middle")) {
                  style += ";align-items:center";
                } else if (val.includes("bottom")) {
                  style += ";align-items:flex-end";
                }
              } else {
                style += ";align-items:center";
              }
              start = style.indexOf("text-align");
              if (start !== -1) {
                const val = style.substr(start + 11, 10);
                if (val.includes("center")) {
                  style += ";justify-content: center";
                } else if (val.includes("right")) {
                  style += ";justify-content: right";
                }
              }
              style = (border ? `;border:${border}px ${borderstyle || "solid"} ${bordercolor || "gray"}` + (spacing ? "" : ";border-right:0;border-bottom:0") : "") + (padding ? `;padding:${padding}px` : "") + ";" + style;
              if (td.attrs.colspan) {
                style += `;grid-column-start:${col};grid-column-end:${col + parseInt(td.attrs.colspan)}`;
                if (!td.attrs.rowspan) {
                  style += `;grid-row-start:${row};grid-row-end:${row + 1}`;
                }
                col += parseInt(td.attrs.colspan) - 1;
              }
              if (td.attrs.rowspan) {
                style += `;grid-row-start:${row};grid-row-end:${row + parseInt(td.attrs.rowspan)}`;
                if (!td.attrs.colspan) {
                  style += `;grid-column-start:${col};grid-column-end:${col + 1}`;
                }
                for (let rowspan = 1; rowspan < td.attrs.rowspan; rowspan++) {
                  for (let colspan = 0; colspan < (td.attrs.colspan || 1); colspan++) {
                    map[row + rowspan + "." + (col - colspan)] = 1;
                  }
                }
              }
              if (style) {
                td.attrs.style = style;
              }
              cells.push(td);
              col++;
            }
          }
          if (row === 1) {
            let temp = "";
            for (let i = 1; i < col; i++) {
              temp += (width[i] ? width[i] : "auto") + " ";
            }
            styleObj["grid-template-columns"] = temp;
          }
        }
        node2.children = cells;
      } else {
        if (node2.c) {
          styleObj.display = "table";
        }
        if (!isNaN(spacing)) {
          styleObj["border-spacing"] = spacing + "px";
        }
        if (border || padding) {
          (function traversal(nodes) {
            for (let i = 0; i < nodes.length; i++) {
              const td = nodes[i];
              if (td.name === "th" || td.name === "td") {
                if (border) {
                  td.attrs.style = `border:${border}px ${borderstyle || "solid"} ${bordercolor || "gray"};${td.attrs.style || ""}`;
                }
                if (padding) {
                  td.attrs.style = `padding:${padding}px;${td.attrs.style || ""}`;
                }
              } else if (td.children) {
                traversal(td.children);
              }
            }
          })(children);
        }
      }
      if (this.options.scrollTable && !(attrs.style || "").includes("inline")) {
        const table = Object.assign({}, node2);
        node2.name = "div";
        node2.attrs = {
          style: "overflow:auto"
        };
        node2.children = [table];
        attrs = table.attrs;
      }
    } else if ((node2.name === "tbody" || node2.name === "tr") && node2.flag && node2.c) {
      node2.flag = void 0;
      (function traversal(nodes) {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].name === "td") {
            for (const style of ["color", "background", "background-color"]) {
              if (styleObj[style]) {
                nodes[i].attrs.style = style + ":" + styleObj[style] + ";" + (nodes[i].attrs.style || "");
              }
            }
          } else {
            traversal(nodes[i].children || []);
          }
        }
      })(children);
    } else if ((node2.name === "td" || node2.name === "th") && (attrs.colspan || attrs.rowspan)) {
      for (let i = this.stack.length; i--; ) {
        if (this.stack[i].name === "table" || this.stack[i].name === "tbody" || this.stack[i].name === "tr") {
          this.stack[i].flag = 1;
        }
      }
    } else if (node2.name === "ruby") {
      node2.name = "span";
      for (let i = 0; i < children.length - 1; i++) {
        if (children[i].type === "text" && children[i + 1].name === "rt") {
          children[i] = {
            name: "div",
            attrs: {
              style: "display:inline-block;text-align:center"
            },
            children: [{
              name: "div",
              attrs: {
                style: "font-size:50%;" + (children[i + 1].attrs.style || "")
              },
              children: children[i + 1].children
            }, children[i]]
          };
          children.splice(i + 1, 1);
        }
      }
    } else if (node2.c) {
      (function traversal(node3) {
        node3.c = 2;
        for (let i = node3.children.length; i--; ) {
          const child = node3.children[i];
          if (child.name && (config.inlineTags[child.name] || (child.attrs.style || "").includes("inline") && child.children) && !child.c) {
            traversal(child);
          }
          if (!child.c || child.name === "table") {
            node3.c = 1;
          }
        }
      })(node2);
    }
    if ((styleObj.display || "").includes("flex") && !node2.c) {
      for (let i = children.length; i--; ) {
        const item = children[i];
        if (item.f) {
          item.attrs.style = (item.attrs.style || "") + item.f;
          item.f = void 0;
        }
      }
    }
    const flex = parent && ((parent.attrs.style || "").includes("flex") || (parent.attrs.style || "").includes("grid")) && !node2.c;
    if (flex) {
      node2.f = ";max-width:100%";
    }
    if (children.length >= 50 && node2.c && !(styleObj.display || "").includes("flex")) {
      mergeNodes(children);
    }
    for (const key in styleObj) {
      if (styleObj[key]) {
        const val = `;${key}:${styleObj[key].replace(" !important", "")}`;
        if (flex && (key.includes("flex") && key !== "flex-direction" || key === "align-self" || key.includes("grid") || styleObj[key][0] === "-" || key.includes("width") && val.includes("%"))) {
          node2.f += val;
          if (key === "width") {
            attrs.style += ";width:100%";
          }
        } else {
          attrs.style += val;
        }
      }
    }
    attrs.style = attrs.style.substr(1) || void 0;
  };
  Parser.prototype.onText = function(text) {
    if (!this.pre) {
      let trim = "";
      let flag;
      for (let i = 0, len = text.length; i < len; i++) {
        if (!blankChar[text[i]]) {
          trim += text[i];
        } else {
          if (trim[trim.length - 1] !== " ") {
            trim += " ";
          }
          if (text[i] === "\n" && !flag) {
            flag = true;
          }
        }
      }
      if (trim === " ") {
        if (flag)
          return;
        else {
          const parent = this.stack[this.stack.length - 1];
          if (parent && parent.name[0] === "t")
            return;
        }
      }
      text = trim;
    }
    const node2 = /* @__PURE__ */ Object.create(null);
    node2.type = "text";
    node2.text = decodeEntity(text);
    if (this.hook(node2)) {
      const siblings = this.stack.length ? this.stack[this.stack.length - 1].children : this.nodes;
      siblings.push(node2);
    }
  };
  function Lexer(handler) {
    this.handler = handler;
  }
  Lexer.prototype.parse = function(content) {
    this.content = content || "";
    this.i = 0;
    this.start = 0;
    this.state = this.text;
    for (let len = this.content.length; this.i !== -1 && this.i < len; ) {
      this.state();
    }
  };
  Lexer.prototype.checkClose = function(method) {
    const selfClose = this.content[this.i] === "/";
    if (this.content[this.i] === ">" || selfClose && this.content[this.i + 1] === ">") {
      if (method) {
        this.handler[method](this.content.substring(this.start, this.i));
      }
      this.i += selfClose ? 2 : 1;
      this.start = this.i;
      this.handler.onOpenTag(selfClose);
      if (this.handler.tagName === "script") {
        this.i = this.content.indexOf("</", this.i);
        if (this.i !== -1) {
          this.i += 2;
          this.start = this.i;
        }
        this.state = this.endTag;
      } else {
        this.state = this.text;
      }
      return true;
    }
    return false;
  };
  Lexer.prototype.text = function() {
    this.i = this.content.indexOf("<", this.i);
    if (this.i === -1) {
      if (this.start < this.content.length) {
        this.handler.onText(this.content.substring(this.start, this.content.length));
      }
      return;
    }
    const c = this.content[this.i + 1];
    if (c >= "a" && c <= "z" || c >= "A" && c <= "Z") {
      if (this.start !== this.i) {
        this.handler.onText(this.content.substring(this.start, this.i));
      }
      this.start = ++this.i;
      this.state = this.tagName;
    } else if (c === "/" || c === "!" || c === "?") {
      if (this.start !== this.i) {
        this.handler.onText(this.content.substring(this.start, this.i));
      }
      const next = this.content[this.i + 2];
      if (c === "/" && (next >= "a" && next <= "z" || next >= "A" && next <= "Z")) {
        this.i += 2;
        this.start = this.i;
        this.state = this.endTag;
        return;
      }
      let end = "-->";
      if (c !== "!" || this.content[this.i + 2] !== "-" || this.content[this.i + 3] !== "-") {
        end = ">";
      }
      this.i = this.content.indexOf(end, this.i);
      if (this.i !== -1) {
        this.i += end.length;
        this.start = this.i;
      }
    } else {
      this.i++;
    }
  };
  Lexer.prototype.tagName = function() {
    if (blankChar[this.content[this.i]]) {
      this.handler.onTagName(this.content.substring(this.start, this.i));
      while (blankChar[this.content[++this.i]])
        ;
      if (this.i < this.content.length && !this.checkClose()) {
        this.start = this.i;
        this.state = this.attrName;
      }
    } else if (!this.checkClose("onTagName")) {
      this.i++;
    }
  };
  Lexer.prototype.attrName = function() {
    let c = this.content[this.i];
    if (blankChar[c] || c === "=") {
      this.handler.onAttrName(this.content.substring(this.start, this.i));
      let needVal = c === "=";
      const len = this.content.length;
      while (++this.i < len) {
        c = this.content[this.i];
        if (!blankChar[c]) {
          if (this.checkClose())
            return;
          if (needVal) {
            this.start = this.i;
            this.state = this.attrVal;
            return;
          }
          if (this.content[this.i] === "=") {
            needVal = true;
          } else {
            this.start = this.i;
            this.state = this.attrName;
            return;
          }
        }
      }
    } else if (!this.checkClose("onAttrName")) {
      this.i++;
    }
  };
  Lexer.prototype.attrVal = function() {
    const c = this.content[this.i];
    const len = this.content.length;
    if (c === '"' || c === "'") {
      this.start = ++this.i;
      this.i = this.content.indexOf(c, this.i);
      if (this.i === -1)
        return;
      this.handler.onAttrVal(this.content.substring(this.start, this.i));
    } else {
      for (; this.i < len; this.i++) {
        if (blankChar[this.content[this.i]]) {
          this.handler.onAttrVal(this.content.substring(this.start, this.i));
          break;
        } else if (this.checkClose("onAttrVal"))
          return;
      }
    }
    while (blankChar[this.content[++this.i]])
      ;
    if (this.i < len && !this.checkClose()) {
      this.start = this.i;
      this.state = this.attrName;
    }
  };
  Lexer.prototype.endTag = function() {
    const c = this.content[this.i];
    if (blankChar[c] || c === ">" || c === "/") {
      this.handler.onCloseTag(this.content.substring(this.start, this.i));
      if (c !== ">") {
        this.i = this.content.indexOf(">", this.i);
        if (this.i === -1)
          return;
      }
      this.start = ++this.i;
      this.state = this.text;
    } else {
      this.i++;
    }
  };
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  function resolveEasycom(component, easycom) {
    return typeof component === "string" ? easycom : component;
  }
  !function(e, t) {
    "object" == typeof exports && "undefined" != typeof module ? t(exports) : "function" == typeof define && define.amd ? define(["exports"], t) : t((e = "undefined" != typeof globalThis ? globalThis : e || self).marked = {});
  }(void 0, function(r) {
    function i(e2, t2) {
      for (var u2 = 0; u2 < t2.length; u2++) {
        var n2 = t2[u2];
        n2.enumerable = n2.enumerable || false, n2.configurable = true, "value" in n2 && (n2.writable = true), Object.defineProperty(e2, function(e3) {
          e3 = function(e4, t3) {
            if ("object" != typeof e4 || null === e4)
              return e4;
            var u3 = e4[Symbol.toPrimitive];
            if (void 0 === u3)
              return ("string" === t3 ? String : Number)(e4);
            u3 = u3.call(e4, t3 || "default");
            if ("object" != typeof u3)
              return u3;
            throw new TypeError("@@toPrimitive must return a primitive value.");
          }(e3, "string");
          return "symbol" == typeof e3 ? e3 : String(e3);
        }(n2.key), n2);
      }
    }
    function F() {
      return (F = Object.assign ? Object.assign.bind() : function(e2) {
        for (var t2 = 1; t2 < arguments.length; t2++) {
          var u2, n2 = arguments[t2];
          for (u2 in n2)
            Object.prototype.hasOwnProperty.call(n2, u2) && (e2[u2] = n2[u2]);
        }
        return e2;
      }).apply(this, arguments);
    }
    function s(e2, t2) {
      (null == t2 || t2 > e2.length) && (t2 = e2.length);
      for (var u2 = 0, n2 = new Array(t2); u2 < t2; u2++)
        n2[u2] = e2[u2];
      return n2;
    }
    function D(e2, t2) {
      var u2, n2 = "undefined" != typeof Symbol && e2[Symbol.iterator] || e2["@@iterator"];
      if (n2)
        return (n2 = n2.call(e2)).next.bind(n2);
      if (Array.isArray(e2) || (n2 = function(e3, t3) {
        var u3;
        if (e3)
          return "string" == typeof e3 ? s(e3, t3) : "Map" === (u3 = "Object" === (u3 = Object.prototype.toString.call(e3).slice(8, -1)) && e3.constructor ? e3.constructor.name : u3) || "Set" === u3 ? Array.from(e3) : "Arguments" === u3 || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(u3) ? s(e3, t3) : void 0;
      }(e2)) || t2 && e2 && "number" == typeof e2.length)
        return n2 && (e2 = n2), u2 = 0, function() {
          return u2 >= e2.length ? { done: true } : { done: false, value: e2[u2++] };
        };
      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    function e() {
      return { async: false, baseUrl: null, breaks: false, extensions: null, gfm: true, headerIds: true, headerPrefix: "", highlight: null, hooks: null, langPrefix: "language-", mangle: true, pedantic: false, renderer: null, sanitize: false, sanitizer: null, silent: false, smartypants: false, tokenizer: null, walkTokens: null, xhtml: false };
    }
    r.defaults = e();
    function u(e2) {
      return t[e2];
    }
    var n = /[&<>"']/, l = new RegExp(n.source, "g"), o = /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, a = new RegExp(o.source, "g"), t = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    function A(e2, t2) {
      if (t2) {
        if (n.test(e2))
          return e2.replace(l, u);
      } else if (o.test(e2))
        return e2.replace(a, u);
      return e2;
    }
    var c = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/gi;
    function x(e2) {
      return e2.replace(c, function(e3, t2) {
        return "colon" === (t2 = t2.toLowerCase()) ? ":" : "#" === t2.charAt(0) ? "x" === t2.charAt(1) ? String.fromCharCode(parseInt(t2.substring(2), 16)) : String.fromCharCode(+t2.substring(1)) : "";
      });
    }
    var h = /(^|[^\[])\^/g;
    function p(u2, e2) {
      u2 = "string" == typeof u2 ? u2 : u2.source, e2 = e2 || "";
      var n2 = { replace: function(e3, t2) {
        return t2 = (t2 = t2.source || t2).replace(h, "$1"), u2 = u2.replace(e3, t2), n2;
      }, getRegex: function() {
        return new RegExp(u2, e2);
      } };
      return n2;
    }
    var Z = /[^\w:]/g, O = /^$|^[a-z][a-z0-9+.-]*:|^[?#]/i;
    function f(e2, t2, u2) {
      if (e2) {
        try {
          n2 = decodeURIComponent(x(u2)).replace(Z, "").toLowerCase();
        } catch (e3) {
          return null;
        }
        if (0 === n2.indexOf("javascript:") || 0 === n2.indexOf("vbscript:") || 0 === n2.indexOf("data:"))
          return null;
      }
      var n2;
      t2 && !O.test(u2) && (e2 = u2, g[" " + (n2 = t2)] || (q.test(n2) ? g[" " + n2] = n2 + "/" : g[" " + n2] = C(n2, "/", true)), t2 = -1 === (n2 = g[" " + n2]).indexOf(":"), u2 = "//" === e2.substring(0, 2) ? t2 ? e2 : n2.replace(j, "$1") + e2 : "/" === e2.charAt(0) ? t2 ? e2 : n2.replace(P, "$1") + e2 : n2 + e2);
      try {
        u2 = encodeURI(u2).replace(/%25/g, "%");
      } catch (e3) {
        return null;
      }
      return u2;
    }
    var g = {}, q = /^[^:]+:\/*[^/]*$/, j = /^([^:]+:)[\s\S]*$/, P = /^([^:]+:\/*[^/]*)[\s\S]*$/;
    var k = { exec: function() {
    } };
    function d(e2, t2) {
      var u2 = e2.replace(/\|/g, function(e3, t3, u3) {
        for (var n3 = false, r2 = t3; 0 <= --r2 && "\\" === u3[r2]; )
          n3 = !n3;
        return n3 ? "|" : " |";
      }).split(/ \|/), n2 = 0;
      if (u2[0].trim() || u2.shift(), 0 < u2.length && !u2[u2.length - 1].trim() && u2.pop(), u2.length > t2)
        u2.splice(t2);
      else
        for (; u2.length < t2; )
          u2.push("");
      for (; n2 < u2.length; n2++)
        u2[n2] = u2[n2].trim().replace(/\\\|/g, "|");
      return u2;
    }
    function C(e2, t2, u2) {
      var n2 = e2.length;
      if (0 === n2)
        return "";
      for (var r2 = 0; r2 < n2; ) {
        var i2 = e2.charAt(n2 - r2 - 1);
        if ((i2 !== t2 || u2) && (i2 === t2 || !u2))
          break;
        r2++;
      }
      return e2.slice(0, n2 - r2);
    }
    function E(e2, t2) {
      if (t2 < 1)
        return "";
      for (var u2 = ""; 1 < t2; )
        1 & t2 && (u2 += e2), t2 >>= 1, e2 += e2;
      return u2 + e2;
    }
    function m(e2, t2, u2, n2) {
      var r2 = t2.href, t2 = t2.title ? A(t2.title) : null, i2 = e2[1].replace(/\\([\[\]])/g, "$1");
      return "!" !== e2[0].charAt(0) ? (n2.state.inLink = true, e2 = { type: "link", raw: u2, href: r2, title: t2, text: i2, tokens: n2.inlineTokens(i2) }, n2.state.inLink = false, e2) : { type: "image", raw: u2, href: r2, title: t2, text: A(i2) };
    }
    var b = function() {
      function e2(e3) {
        this.options = e3 || r.defaults;
      }
      var t2 = e2.prototype;
      return t2.space = function(e3) {
        e3 = this.rules.block.newline.exec(e3);
        if (e3 && 0 < e3[0].length)
          return { type: "space", raw: e3[0] };
      }, t2.code = function(e3) {
        var t3, e3 = this.rules.block.code.exec(e3);
        if (e3)
          return t3 = e3[0].replace(/^ {1,4}/gm, ""), { type: "code", raw: e3[0], codeBlockStyle: "indented", text: this.options.pedantic ? t3 : C(t3, "\n") };
      }, t2.fences = function(e3) {
        var t3, u2, n2, r2, e3 = this.rules.block.fences.exec(e3);
        if (e3)
          return t3 = e3[0], u2 = t3, n2 = e3[3] || "", u2 = null === (u2 = t3.match(/^(\s+)(?:```)/)) ? n2 : (r2 = u2[1], n2.split("\n").map(function(e4) {
            var t4 = e4.match(/^\s+/);
            return null !== t4 && t4[0].length >= r2.length ? e4.slice(r2.length) : e4;
          }).join("\n")), { type: "code", raw: t3, lang: e3[2] && e3[2].trim().replace(this.rules.inline._escapes, "$1"), text: u2 };
      }, t2.heading = function(e3) {
        var t3, u2, e3 = this.rules.block.heading.exec(e3);
        if (e3)
          return t3 = e3[2].trim(), /#$/.test(t3) && (u2 = C(t3, "#"), !this.options.pedantic && u2 && !/ $/.test(u2) || (t3 = u2.trim())), { type: "heading", raw: e3[0], depth: e3[1].length, text: t3, tokens: this.lexer.inline(t3) };
      }, t2.hr = function(e3) {
        e3 = this.rules.block.hr.exec(e3);
        if (e3)
          return { type: "hr", raw: e3[0] };
      }, t2.blockquote = function(e3) {
        var t3, u2, n2, e3 = this.rules.block.blockquote.exec(e3);
        if (e3)
          return t3 = e3[0].replace(/^ *>[ \t]?/gm, ""), u2 = this.lexer.state.top, this.lexer.state.top = true, n2 = this.lexer.blockTokens(t3), this.lexer.state.top = u2, { type: "blockquote", raw: e3[0], tokens: n2, text: t3 };
      }, t2.list = function(e3) {
        var t3 = this.rules.block.list.exec(e3);
        if (t3) {
          var u2, n2, r2, i2, s2, l2, o2, a2, D2, c2, h2, p2 = 1 < (g2 = t3[1].trim()).length, f2 = { type: "list", raw: "", ordered: p2, start: p2 ? +g2.slice(0, -1) : "", loose: false, items: [] }, g2 = p2 ? "\\d{1,9}\\" + g2.slice(-1) : "\\" + g2;
          this.options.pedantic && (g2 = p2 ? g2 : "[*+-]");
          for (var F2 = new RegExp("^( {0,3}" + g2 + ")((?:[	 ][^\\n]*)?(?:\\n|$))"); e3 && (h2 = false, t3 = F2.exec(e3)) && !this.rules.block.hr.test(e3); ) {
            if (u2 = t3[0], e3 = e3.substring(u2.length), o2 = t3[2].split("\n", 1)[0].replace(/^\t+/, function(e4) {
              return " ".repeat(3 * e4.length);
            }), a2 = e3.split("\n", 1)[0], this.options.pedantic ? (i2 = 2, c2 = o2.trimLeft()) : (i2 = t3[2].search(/[^ ]/), c2 = o2.slice(i2 = 4 < i2 ? 1 : i2), i2 += t3[1].length), s2 = false, !o2 && /^ *$/.test(a2) && (u2 += a2 + "\n", e3 = e3.substring(a2.length + 1), h2 = true), !h2)
              for (var A2 = new RegExp("^ {0," + Math.min(3, i2 - 1) + "}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))"), k2 = new RegExp("^ {0," + Math.min(3, i2 - 1) + "}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)"), d2 = new RegExp("^ {0," + Math.min(3, i2 - 1) + "}(?:```|~~~)"), C2 = new RegExp("^ {0," + Math.min(3, i2 - 1) + "}#"); e3 && (a2 = D2 = e3.split("\n", 1)[0], this.options.pedantic && (a2 = a2.replace(/^ {1,4}(?=( {4})*[^ ])/g, "  ")), !d2.test(a2)) && !C2.test(a2) && !A2.test(a2) && !k2.test(e3); ) {
                if (a2.search(/[^ ]/) >= i2 || !a2.trim())
                  c2 += "\n" + a2.slice(i2);
                else {
                  if (s2)
                    break;
                  if (4 <= o2.search(/[^ ]/))
                    break;
                  if (d2.test(o2))
                    break;
                  if (C2.test(o2))
                    break;
                  if (k2.test(o2))
                    break;
                  c2 += "\n" + a2;
                }
                s2 || a2.trim() || (s2 = true), u2 += D2 + "\n", e3 = e3.substring(D2.length + 1), o2 = a2.slice(i2);
              }
            f2.loose || (l2 ? f2.loose = true : /\n *\n *$/.test(u2) && (l2 = true)), this.options.gfm && (n2 = /^\[[ xX]\] /.exec(c2)) && (r2 = "[ ] " !== n2[0], c2 = c2.replace(/^\[[ xX]\] +/, "")), f2.items.push({ type: "list_item", raw: u2, task: !!n2, checked: r2, loose: false, text: c2 }), f2.raw += u2;
          }
          f2.items[f2.items.length - 1].raw = u2.trimRight(), f2.items[f2.items.length - 1].text = c2.trimRight(), f2.raw = f2.raw.trimRight();
          for (var E2, x2 = f2.items.length, m2 = 0; m2 < x2; m2++)
            this.lexer.state.top = false, f2.items[m2].tokens = this.lexer.blockTokens(f2.items[m2].text, []), f2.loose || (E2 = 0 < (E2 = f2.items[m2].tokens.filter(function(e4) {
              return "space" === e4.type;
            })).length && E2.some(function(e4) {
              return /\n.*\n/.test(e4.raw);
            }), f2.loose = E2);
          if (f2.loose)
            for (m2 = 0; m2 < x2; m2++)
              f2.items[m2].loose = true;
          return f2;
        }
      }, t2.html = function(e3) {
        var t3, e3 = this.rules.block.html.exec(e3);
        if (e3)
          return t3 = { type: "html", raw: e3[0], pre: !this.options.sanitizer && ("pre" === e3[1] || "script" === e3[1] || "style" === e3[1]), text: e3[0] }, this.options.sanitize && (e3 = this.options.sanitizer ? this.options.sanitizer(e3[0]) : A(e3[0]), t3.type = "paragraph", t3.text = e3, t3.tokens = this.lexer.inline(e3)), t3;
      }, t2.def = function(e3) {
        var t3, u2, n2, e3 = this.rules.block.def.exec(e3);
        if (e3)
          return t3 = e3[1].toLowerCase().replace(/\s+/g, " "), u2 = e3[2] ? e3[2].replace(/^<(.*)>$/, "$1").replace(this.rules.inline._escapes, "$1") : "", n2 = e3[3] && e3[3].substring(1, e3[3].length - 1).replace(this.rules.inline._escapes, "$1"), { type: "def", tag: t3, raw: e3[0], href: u2, title: n2 };
      }, t2.table = function(e3) {
        e3 = this.rules.block.table.exec(e3);
        if (e3) {
          var t3 = { type: "table", header: d(e3[1]).map(function(e4) {
            return { text: e4 };
          }), align: e3[2].replace(/^ *|\| *$/g, "").split(/ *\| */), rows: e3[3] && e3[3].trim() ? e3[3].replace(/\n[ \t]*$/, "").split("\n") : [] };
          if (t3.header.length === t3.align.length) {
            t3.raw = e3[0];
            for (var u2, n2, r2, i2 = t3.align.length, s2 = 0; s2 < i2; s2++)
              /^ *-+: *$/.test(t3.align[s2]) ? t3.align[s2] = "right" : /^ *:-+: *$/.test(t3.align[s2]) ? t3.align[s2] = "center" : /^ *:-+ *$/.test(t3.align[s2]) ? t3.align[s2] = "left" : t3.align[s2] = null;
            for (i2 = t3.rows.length, s2 = 0; s2 < i2; s2++)
              t3.rows[s2] = d(t3.rows[s2], t3.header.length).map(function(e4) {
                return { text: e4 };
              });
            for (i2 = t3.header.length, u2 = 0; u2 < i2; u2++)
              t3.header[u2].tokens = this.lexer.inline(t3.header[u2].text);
            for (i2 = t3.rows.length, u2 = 0; u2 < i2; u2++)
              for (r2 = t3.rows[u2], n2 = 0; n2 < r2.length; n2++)
                r2[n2].tokens = this.lexer.inline(r2[n2].text);
            return t3;
          }
        }
      }, t2.lheading = function(e3) {
        e3 = this.rules.block.lheading.exec(e3);
        if (e3)
          return { type: "heading", raw: e3[0], depth: "=" === e3[2].charAt(0) ? 1 : 2, text: e3[1], tokens: this.lexer.inline(e3[1]) };
      }, t2.paragraph = function(e3) {
        var t3, e3 = this.rules.block.paragraph.exec(e3);
        if (e3)
          return t3 = "\n" === e3[1].charAt(e3[1].length - 1) ? e3[1].slice(0, -1) : e3[1], { type: "paragraph", raw: e3[0], text: t3, tokens: this.lexer.inline(t3) };
      }, t2.text = function(e3) {
        e3 = this.rules.block.text.exec(e3);
        if (e3)
          return { type: "text", raw: e3[0], text: e3[0], tokens: this.lexer.inline(e3[0]) };
      }, t2.escape = function(e3) {
        e3 = this.rules.inline.escape.exec(e3);
        if (e3)
          return { type: "escape", raw: e3[0], text: A(e3[1]) };
      }, t2.tag = function(e3) {
        e3 = this.rules.inline.tag.exec(e3);
        if (e3)
          return !this.lexer.state.inLink && /^<a /i.test(e3[0]) ? this.lexer.state.inLink = true : this.lexer.state.inLink && /^<\/a>/i.test(e3[0]) && (this.lexer.state.inLink = false), !this.lexer.state.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(e3[0]) ? this.lexer.state.inRawBlock = true : this.lexer.state.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(e3[0]) && (this.lexer.state.inRawBlock = false), { type: this.options.sanitize ? "text" : "html", raw: e3[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, text: this.options.sanitize ? this.options.sanitizer ? this.options.sanitizer(e3[0]) : A(e3[0]) : e3[0] };
      }, t2.link = function(e3) {
        e3 = this.rules.inline.link.exec(e3);
        if (e3) {
          var t3 = e3[2].trim();
          if (!this.options.pedantic && /^</.test(t3)) {
            if (!/>$/.test(t3))
              return;
            var u2 = C(t3.slice(0, -1), "\\");
            if ((t3.length - u2.length) % 2 == 0)
              return;
          } else {
            u2 = function(e4, t4) {
              if (-1 !== e4.indexOf(t4[1])) {
                for (var u3 = e4.length, n3 = 0, r3 = 0; r3 < u3; r3++)
                  if ("\\" === e4[r3])
                    r3++;
                  else if (e4[r3] === t4[0])
                    n3++;
                  else if (e4[r3] === t4[1] && --n3 < 0)
                    return r3;
              }
              return -1;
            }(e3[2], "()");
            -1 < u2 && (r2 = (0 === e3[0].indexOf("!") ? 5 : 4) + e3[1].length + u2, e3[2] = e3[2].substring(0, u2), e3[0] = e3[0].substring(0, r2).trim(), e3[3] = "");
          }
          var n2, u2 = e3[2], r2 = "";
          return this.options.pedantic ? (n2 = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(u2)) && (u2 = n2[1], r2 = n2[3]) : r2 = e3[3] ? e3[3].slice(1, -1) : "", u2 = u2.trim(), m(e3, { href: (u2 = /^</.test(u2) ? this.options.pedantic && !/>$/.test(t3) ? u2.slice(1) : u2.slice(1, -1) : u2) && u2.replace(this.rules.inline._escapes, "$1"), title: r2 && r2.replace(this.rules.inline._escapes, "$1") }, e3[0], this.lexer);
        }
      }, t2.reflink = function(e3, t3) {
        var u2;
        if (u2 = (u2 = this.rules.inline.reflink.exec(e3)) || this.rules.inline.nolink.exec(e3))
          return (e3 = t3[(e3 = (u2[2] || u2[1]).replace(/\s+/g, " ")).toLowerCase()]) ? m(u2, e3, u2[0], this.lexer) : { type: "text", raw: t3 = u2[0].charAt(0), text: t3 };
      }, t2.emStrong = function(e3, t3, u2) {
        void 0 === u2 && (u2 = "");
        var n2 = this.rules.inline.emStrong.lDelim.exec(e3);
        if (n2 && (!n2[3] || !u2.match(/(?:[0-9A-Za-z\xAA\xB2\xB3\xB5\xB9\xBA\xBC-\xBE\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u05D0-\u05EA\u05EF-\u05F2\u0620-\u064A\u0660-\u0669\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07C0-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u0870-\u0887\u0889-\u088E\u08A0-\u08C9\u0904-\u0939\u093D\u0950\u0958-\u0961\u0966-\u096F\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09E6-\u09F1\u09F4-\u09F9\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A66-\u0A6F\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AE6-\u0AEF\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B66-\u0B6F\u0B71-\u0B77\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0BE6-\u0BF2\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C5D\u0C60\u0C61\u0C66-\u0C6F\u0C78-\u0C7E\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDD\u0CDE\u0CE0\u0CE1\u0CE6-\u0CEF\u0CF1\u0CF2\u0D04-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D58-\u0D61\u0D66-\u0D78\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DE6-\u0DEF\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F20-\u0F33\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F-\u1049\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u1090-\u1099\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1369-\u137C\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u1711\u171F-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u17E0-\u17E9\u17F0-\u17F9\u1810-\u1819\u1820-\u1878\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A16\u1A20-\u1A54\u1A80-\u1A89\u1A90-\u1A99\u1AA7\u1B05-\u1B33\u1B45-\u1B4C\u1B50-\u1B59\u1B83-\u1BA0\u1BAE-\u1BE5\u1C00-\u1C23\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1C90-\u1CBA\u1CBD-\u1CBF\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2070\u2071\u2074-\u2079\u207F-\u2089\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2150-\u2189\u2460-\u249B\u24EA-\u24FF\u2776-\u2793\u2C00-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2CFD\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u3192-\u3195\u31A0-\u31BF\u31F0-\u31FF\u3220-\u3229\u3248-\u324F\u3251-\u325F\u3280-\u3289\u32B1-\u32BF\u3400-\u4DBF\u4E00-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7CA\uA7D0\uA7D1\uA7D3\uA7D5-\uA7D9\uA7F2-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA830-\uA835\uA840-\uA873\uA882-\uA8B3\uA8D0-\uA8D9\uA8F2-\uA8F7\uA8FB\uA8FD\uA8FE\uA900-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF-\uA9D9\uA9E0-\uA9E4\uA9E6-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA50-\uAA59\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB69\uAB70-\uABE2\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD07-\uDD33\uDD40-\uDD78\uDD8A\uDD8B\uDE80-\uDE9C\uDEA0-\uDED0\uDEE1-\uDEFB\uDF00-\uDF23\uDF2D-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDD70-\uDD7A\uDD7C-\uDD8A\uDD8C-\uDD92\uDD94\uDD95\uDD97-\uDDA1\uDDA3-\uDDB1\uDDB3-\uDDB9\uDDBB\uDDBC\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67\uDF80-\uDF85\uDF87-\uDFB0\uDFB2-\uDFBA]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC58-\uDC76\uDC79-\uDC9E\uDCA7-\uDCAF\uDCE0-\uDCF2\uDCF4\uDCF5\uDCFB-\uDD1B\uDD20-\uDD39\uDD80-\uDDB7\uDDBC-\uDDCF\uDDD2-\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE35\uDE40-\uDE48\uDE60-\uDE7E\uDE80-\uDE9F\uDEC0-\uDEC7\uDEC9-\uDEE4\uDEEB-\uDEEF\uDF00-\uDF35\uDF40-\uDF55\uDF58-\uDF72\uDF78-\uDF91\uDFA9-\uDFAF]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2\uDCFA-\uDD23\uDD30-\uDD39\uDE60-\uDE7E\uDE80-\uDEA9\uDEB0\uDEB1\uDF00-\uDF27\uDF30-\uDF45\uDF51-\uDF54\uDF70-\uDF81\uDFB0-\uDFCB\uDFE0-\uDFF6]|\uD804[\uDC03-\uDC37\uDC52-\uDC6F\uDC71\uDC72\uDC75\uDC83-\uDCAF\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD03-\uDD26\uDD36-\uDD3F\uDD44\uDD47\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDD0-\uDDDA\uDDDC\uDDE1-\uDDF4\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDEF0-\uDEF9\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC50-\uDC59\uDC5F-\uDC61\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE50-\uDE59\uDE80-\uDEAA\uDEB8\uDEC0-\uDEC9\uDF00-\uDF1A\uDF30-\uDF3B\uDF40-\uDF46]|\uD806[\uDC00-\uDC2B\uDCA0-\uDCF2\uDCFF-\uDD06\uDD09\uDD0C-\uDD13\uDD15\uDD16\uDD18-\uDD2F\uDD3F\uDD41\uDD50-\uDD59\uDDA0-\uDDA7\uDDAA-\uDDD0\uDDE1\uDDE3\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE89\uDE9D\uDEB0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC50-\uDC6C\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46\uDD50-\uDD59\uDD60-\uDD65\uDD67\uDD68\uDD6A-\uDD89\uDD98\uDDA0-\uDDA9\uDEE0-\uDEF2\uDFB0\uDFC0-\uDFD4]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|\uD80B[\uDF90-\uDFF0]|[\uD80C\uD81C-\uD820\uD822\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879\uD880-\uD883][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDE70-\uDEBE\uDEC0-\uDEC9\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF50-\uDF59\uDF5B-\uDF61\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDE40-\uDE96\uDF00-\uDF4A\uDF50\uDF93-\uDF9F\uDFE0\uDFE1\uDFE3]|\uD821[\uDC00-\uDFF7]|\uD823[\uDC00-\uDCD5\uDD00-\uDD08]|\uD82B[\uDFF0-\uDFF3\uDFF5-\uDFFB\uDFFD\uDFFE]|\uD82C[\uDC00-\uDD22\uDD50-\uDD52\uDD64-\uDD67\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD834[\uDEE0-\uDEF3\uDF60-\uDF78]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD837[\uDF00-\uDF1E]|\uD838[\uDD00-\uDD2C\uDD37-\uDD3D\uDD40-\uDD49\uDD4E\uDE90-\uDEAD\uDEC0-\uDEEB\uDEF0-\uDEF9]|\uD839[\uDFE0-\uDFE6\uDFE8-\uDFEB\uDFED\uDFEE\uDFF0-\uDFFE]|\uD83A[\uDC00-\uDCC4\uDCC7-\uDCCF\uDD00-\uDD43\uDD4B\uDD50-\uDD59]|\uD83B[\uDC71-\uDCAB\uDCAD-\uDCAF\uDCB1-\uDCB4\uDD01-\uDD2D\uDD2F-\uDD3D\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD83C[\uDD00-\uDD0C]|\uD83E[\uDFF0-\uDFF9]|\uD869[\uDC00-\uDEDF\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF38\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uD884[\uDC00-\uDF4A])/))) {
          var r2 = n2[1] || n2[2] || "";
          if (!r2 || "" === u2 || this.rules.inline.punctuation.exec(u2)) {
            var i2 = n2[0].length - 1, s2 = i2, l2 = 0, o2 = "*" === n2[0][0] ? this.rules.inline.emStrong.rDelimAst : this.rules.inline.emStrong.rDelimUnd;
            for (o2.lastIndex = 0, t3 = t3.slice(-1 * e3.length + i2); null != (n2 = o2.exec(t3)); ) {
              var a2, D2 = n2[1] || n2[2] || n2[3] || n2[4] || n2[5] || n2[6];
              if (D2) {
                if (a2 = D2.length, n2[3] || n2[4])
                  s2 += a2;
                else if ((n2[5] || n2[6]) && i2 % 3 && !((i2 + a2) % 3))
                  l2 += a2;
                else if (!(0 < (s2 -= a2)))
                  return a2 = Math.min(a2, a2 + s2 + l2), D2 = e3.slice(0, i2 + n2.index + (n2[0].length - D2.length) + a2), Math.min(i2, a2) % 2 ? (a2 = D2.slice(1, -1), { type: "em", raw: D2, text: a2, tokens: this.lexer.inlineTokens(a2) }) : (a2 = D2.slice(2, -2), { type: "strong", raw: D2, text: a2, tokens: this.lexer.inlineTokens(a2) });
              }
            }
          }
        }
      }, t2.codespan = function(e3) {
        var t3, u2, n2, e3 = this.rules.inline.code.exec(e3);
        if (e3)
          return n2 = e3[2].replace(/\n/g, " "), t3 = /[^ ]/.test(n2), u2 = /^ /.test(n2) && / $/.test(n2), n2 = A(n2 = t3 && u2 ? n2.substring(1, n2.length - 1) : n2, true), { type: "codespan", raw: e3[0], text: n2 };
      }, t2.br = function(e3) {
        e3 = this.rules.inline.br.exec(e3);
        if (e3)
          return { type: "br", raw: e3[0] };
      }, t2.del = function(e3) {
        e3 = this.rules.inline.del.exec(e3);
        if (e3)
          return { type: "del", raw: e3[0], text: e3[2], tokens: this.lexer.inlineTokens(e3[2]) };
      }, t2.autolink = function(e3, t3) {
        var u2, e3 = this.rules.inline.autolink.exec(e3);
        if (e3)
          return t3 = "@" === e3[2] ? "mailto:" + (u2 = A(this.options.mangle ? t3(e3[1]) : e3[1])) : u2 = A(e3[1]), { type: "link", raw: e3[0], text: u2, href: t3, tokens: [{ type: "text", raw: u2, text: u2 }] };
      }, t2.url = function(e3, t3) {
        var u2, n2, r2, i2;
        if (u2 = this.rules.inline.url.exec(e3)) {
          if ("@" === u2[2])
            r2 = "mailto:" + (n2 = A(this.options.mangle ? t3(u2[0]) : u2[0]));
          else {
            for (; i2 = u2[0], u2[0] = this.rules.inline._backpedal.exec(u2[0])[0], i2 !== u2[0]; )
              ;
            n2 = A(u2[0]), r2 = "www." === u2[1] ? "http://" + u2[0] : u2[0];
          }
          return { type: "link", raw: u2[0], text: n2, href: r2, tokens: [{ type: "text", raw: n2, text: n2 }] };
        }
      }, t2.inlineText = function(e3, t3) {
        e3 = this.rules.inline.text.exec(e3);
        if (e3)
          return t3 = this.lexer.state.inRawBlock ? this.options.sanitize ? this.options.sanitizer ? this.options.sanitizer(e3[0]) : A(e3[0]) : e3[0] : A(this.options.smartypants ? t3(e3[0]) : e3[0]), { type: "text", raw: e3[0], text: t3 };
      }, e2;
    }(), B = { newline: /^(?: *(?:\n|$))+/, code: /^( {4}[^\n]+(?:\n(?: *(?:\n|$))*)?)+/, fences: /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/, hr: /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/, heading: /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/, blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/, list: /^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/, html: "^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n *)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$))", def: /^ {0,3}\[(label)\]: *(?:\n *)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n *)?| *\n *)(title))? *(?:\n+|$)/, table: k, lheading: /^((?:.|\n(?!\n))+?)\n {0,3}(=+|-+) *(?:\n+|$)/, _paragraph: /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/, text: /^[^\n]+/, _label: /(?!\s*\])(?:\\.|[^\[\]\\])+/, _title: /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/ }, w = (B.def = p(B.def).replace("label", B._label).replace("title", B._title).getRegex(), B.bullet = /(?:[*+-]|\d{1,9}[.)])/, B.listItemStart = p(/^( *)(bull) */).replace("bull", B.bullet).getRegex(), B.list = p(B.list).replace(/bull/g, B.bullet).replace("hr", "\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))").replace("def", "\\n+(?=" + B.def.source + ")").getRegex(), B._tag = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul", B._comment = /<!--(?!-?>)[\s\S]*?(?:-->|$)/, B.html = p(B.html, "i").replace("comment", B._comment).replace("tag", B._tag).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(), B.paragraph = p(B._paragraph).replace("hr", B.hr).replace("heading", " {0,3}#{1,6} ").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", B._tag).getRegex(), B.blockquote = p(B.blockquote).replace("paragraph", B.paragraph).getRegex(), B.normal = F({}, B), B.gfm = F({}, B.normal, { table: "^ *([^\\n ].*\\|.*)\\n {0,3}(?:\\| *)?(:?-+:? *(?:\\| *:?-+:? *)*)(?:\\| *)?(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)" }), B.gfm.table = p(B.gfm.table).replace("hr", B.hr).replace("heading", " {0,3}#{1,6} ").replace("blockquote", " {0,3}>").replace("code", " {4}[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", B._tag).getRegex(), B.gfm.paragraph = p(B._paragraph).replace("hr", B.hr).replace("heading", " {0,3}#{1,6} ").replace("|lheading", "").replace("table", B.gfm.table).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", B._tag).getRegex(), B.pedantic = F({}, B.normal, { html: p(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", B._comment).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: k, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: p(B.normal._paragraph).replace("hr", B.hr).replace("heading", " *#{1,6} *[^\n]").replace("lheading", B.lheading).replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").getRegex() }), { escape: /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/, autolink: /^<(scheme:[^\s\x00-\x1f<>]*|email)>/, url: k, tag: "^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>", link: /^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/, reflink: /^!?\[(label)\]\[(ref)\]/, nolink: /^!?\[(ref)\](?:\[\])?/, reflinkSearch: "reflink|nolink(?!\\()", emStrong: { lDelim: /^(?:\*+(?:([punct_])|[^\s*]))|^_+(?:([punct*])|([^\s_]))/, rDelimAst: /^(?:[^_*\\]|\\.)*?\_\_(?:[^_*\\]|\\.)*?\*(?:[^_*\\]|\\.)*?(?=\_\_)|(?:[^*\\]|\\.)+(?=[^*])|[punct_](\*+)(?=[\s]|$)|(?:[^punct*_\s\\]|\\.)(\*+)(?=[punct_\s]|$)|[punct_\s](\*+)(?=[^punct*_\s])|[\s](\*+)(?=[punct_])|[punct_](\*+)(?=[punct_])|(?:[^punct*_\s\\]|\\.)(\*+)(?=[^punct*_\s])/, rDelimUnd: /^(?:[^_*\\]|\\.)*?\*\*(?:[^_*\\]|\\.)*?\_(?:[^_*\\]|\\.)*?(?=\*\*)|(?:[^_\\]|\\.)+(?=[^_])|[punct*](\_+)(?=[\s]|$)|(?:[^punct*_\s\\]|\\.)(\_+)(?=[punct*\s]|$)|[punct*\s](\_+)(?=[^punct*_\s])|[\s](\_+)(?=[punct*])|[punct*](\_+)(?=[punct*])/ }, code: /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/, br: /^( {2,}|\\)\n(?!\s*$)/, del: k, text: /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/, punctuation: /^([\spunctuation])/ });
    function L(e2) {
      return e2.replace(/---/g, "—").replace(/--/g, "–").replace(/(^|[-\u2014/(\[{"\s])'/g, "$1‘").replace(/'/g, "’").replace(/(^|[-\u2014/(\[{\u2018\s])"/g, "$1“").replace(/"/g, "”").replace(/\.{3}/g, "…");
    }
    function y(e2) {
      for (var t2, u2 = "", n2 = e2.length, r2 = 0; r2 < n2; r2++)
        t2 = e2.charCodeAt(r2), u2 += "&#" + (t2 = 0.5 < Math.random() ? "x" + t2.toString(16) : t2) + ";";
      return u2;
    }
    w._punctuation = "!\"#$%&'()+\\-.,/:;<=>?@\\[\\]`^{|}~", w.punctuation = p(w.punctuation).replace(/punctuation/g, w._punctuation).getRegex(), w.blockSkip = /\[[^\]]*?\]\([^\)]*?\)|`[^`]*?`|<[^>]*?>/g, w.escapedEmSt = /(?:^|[^\\])(?:\\\\)*\\[*_]/g, w._comment = p(B._comment).replace("(?:-->|$)", "-->").getRegex(), w.emStrong.lDelim = p(w.emStrong.lDelim).replace(/punct/g, w._punctuation).getRegex(), w.emStrong.rDelimAst = p(w.emStrong.rDelimAst, "g").replace(/punct/g, w._punctuation).getRegex(), w.emStrong.rDelimUnd = p(w.emStrong.rDelimUnd, "g").replace(/punct/g, w._punctuation).getRegex(), w._escapes = /\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g, w._scheme = /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/, w._email = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/, w.autolink = p(w.autolink).replace("scheme", w._scheme).replace("email", w._email).getRegex(), w._attribute = /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/, w.tag = p(w.tag).replace("comment", w._comment).replace("attribute", w._attribute).getRegex(), w._label = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/, w._href = /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/, w._title = /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/, w.link = p(w.link).replace("label", w._label).replace("href", w._href).replace("title", w._title).getRegex(), w.reflink = p(w.reflink).replace("label", w._label).replace("ref", B._label).getRegex(), w.nolink = p(w.nolink).replace("ref", B._label).getRegex(), w.reflinkSearch = p(w.reflinkSearch, "g").replace("reflink", w.reflink).replace("nolink", w.nolink).getRegex(), w.normal = F({}, w), w.pedantic = F({}, w.normal, { strong: { start: /^__|\*\*/, middle: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/, endAst: /\*\*(?!\*)/g, endUnd: /__(?!_)/g }, em: { start: /^_|\*/, middle: /^()\*(?=\S)([\s\S]*?\S)\*(?!\*)|^_(?=\S)([\s\S]*?\S)_(?!_)/, endAst: /\*(?!\*)/g, endUnd: /_(?!_)/g }, link: p(/^!?\[(label)\]\((.*?)\)/).replace("label", w._label).getRegex(), reflink: p(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", w._label).getRegex() }), w.gfm = F({}, w.normal, { escape: p(w.escape).replace("])", "~|])").getRegex(), _extended_email: /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/, url: /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/, _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])([\s\S]*?[^\s~])\1(?=[^~]|$)/, text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/ }), w.gfm.url = p(w.gfm.url, "i").replace("email", w.gfm._extended_email).getRegex(), w.breaks = F({}, w.gfm, { br: p(w.br).replace("{2,}", "*").getRegex(), text: p(w.gfm.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() });
    var v = function() {
      function u2(e3) {
        this.tokens = [], this.tokens.links = /* @__PURE__ */ Object.create(null), this.options = e3 || r.defaults, this.options.tokenizer = this.options.tokenizer || new b(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, (this.tokenizer.lexer = this).inlineQueue = [], this.state = { inLink: false, inRawBlock: false, top: true };
        e3 = { block: B.normal, inline: w.normal };
        this.options.pedantic ? (e3.block = B.pedantic, e3.inline = w.pedantic) : this.options.gfm && (e3.block = B.gfm, this.options.breaks ? e3.inline = w.breaks : e3.inline = w.gfm), this.tokenizer.rules = e3;
      }
      u2.lex = function(e3, t3) {
        return new u2(t3).lex(e3);
      }, u2.lexInline = function(e3, t3) {
        return new u2(t3).inlineTokens(e3);
      };
      var e2, t2, n2 = u2.prototype;
      return n2.lex = function(e3) {
        var t3;
        for (e3 = e3.replace(/\r\n|\r/g, "\n"), this.blockTokens(e3, this.tokens); t3 = this.inlineQueue.shift(); )
          this.inlineTokens(t3.src, t3.tokens);
        return this.tokens;
      }, n2.blockTokens = function(r2, t3) {
        var u3, e3, i2, n3, s2 = this;
        for (void 0 === t3 && (t3 = []), r2 = this.options.pedantic ? r2.replace(/\t/g, "    ").replace(/^ +$/gm, "") : r2.replace(/^( *)(\t+)/gm, function(e4, t4, u4) {
          return t4 + "    ".repeat(u4.length);
        }); r2; )
          if (!(this.options.extensions && this.options.extensions.block && this.options.extensions.block.some(function(e4) {
            return !!(u3 = e4.call({ lexer: s2 }, r2, t3)) && (r2 = r2.substring(u3.raw.length), t3.push(u3), true);
          }))) {
            if (u3 = this.tokenizer.space(r2))
              r2 = r2.substring(u3.raw.length), 1 === u3.raw.length && 0 < t3.length ? t3[t3.length - 1].raw += "\n" : t3.push(u3);
            else if (u3 = this.tokenizer.code(r2))
              r2 = r2.substring(u3.raw.length), !(e3 = t3[t3.length - 1]) || "paragraph" !== e3.type && "text" !== e3.type ? t3.push(u3) : (e3.raw += "\n" + u3.raw, e3.text += "\n" + u3.text, this.inlineQueue[this.inlineQueue.length - 1].src = e3.text);
            else if (u3 = this.tokenizer.fences(r2))
              r2 = r2.substring(u3.raw.length), t3.push(u3);
            else if (u3 = this.tokenizer.heading(r2))
              r2 = r2.substring(u3.raw.length), t3.push(u3);
            else if (u3 = this.tokenizer.hr(r2))
              r2 = r2.substring(u3.raw.length), t3.push(u3);
            else if (u3 = this.tokenizer.blockquote(r2))
              r2 = r2.substring(u3.raw.length), t3.push(u3);
            else if (u3 = this.tokenizer.list(r2))
              r2 = r2.substring(u3.raw.length), t3.push(u3);
            else if (u3 = this.tokenizer.html(r2))
              r2 = r2.substring(u3.raw.length), t3.push(u3);
            else if (u3 = this.tokenizer.def(r2))
              r2 = r2.substring(u3.raw.length), !(e3 = t3[t3.length - 1]) || "paragraph" !== e3.type && "text" !== e3.type ? this.tokens.links[u3.tag] || (this.tokens.links[u3.tag] = { href: u3.href, title: u3.title }) : (e3.raw += "\n" + u3.raw, e3.text += "\n" + u3.raw, this.inlineQueue[this.inlineQueue.length - 1].src = e3.text);
            else if (u3 = this.tokenizer.table(r2))
              r2 = r2.substring(u3.raw.length), t3.push(u3);
            else if (u3 = this.tokenizer.lheading(r2))
              r2 = r2.substring(u3.raw.length), t3.push(u3);
            else if (i2 = r2, this.options.extensions && this.options.extensions.startBlock && !function() {
              var t4 = 1 / 0, u4 = r2.slice(1), n4 = void 0;
              s2.options.extensions.startBlock.forEach(function(e4) {
                "number" == typeof (n4 = e4.call({ lexer: this }, u4)) && 0 <= n4 && (t4 = Math.min(t4, n4));
              }), t4 < 1 / 0 && 0 <= t4 && (i2 = r2.substring(0, t4 + 1));
            }(), this.state.top && (u3 = this.tokenizer.paragraph(i2)))
              e3 = t3[t3.length - 1], n3 && "paragraph" === e3.type ? (e3.raw += "\n" + u3.raw, e3.text += "\n" + u3.text, this.inlineQueue.pop(), this.inlineQueue[this.inlineQueue.length - 1].src = e3.text) : t3.push(u3), n3 = i2.length !== r2.length, r2 = r2.substring(u3.raw.length);
            else if (u3 = this.tokenizer.text(r2))
              r2 = r2.substring(u3.raw.length), (e3 = t3[t3.length - 1]) && "text" === e3.type ? (e3.raw += "\n" + u3.raw, e3.text += "\n" + u3.text, this.inlineQueue.pop(), this.inlineQueue[this.inlineQueue.length - 1].src = e3.text) : t3.push(u3);
            else if (r2) {
              var l2 = "Infinite loop on byte: " + r2.charCodeAt(0);
              if (this.options.silent) {
                formatAppLog("error", "at uni_modules/mp-html/plugins/markdown/marked.min.js:6", l2);
                break;
              }
              throw new Error(l2);
            }
          }
        return this.state.top = true, t3;
      }, n2.inline = function(e3, t3) {
        return this.inlineQueue.push({ src: e3, tokens: t3 = void 0 === t3 ? [] : t3 }), t3;
      }, n2.inlineTokens = function(r2, t3) {
        var u3, e3, i2, n3, s2, l2, o2 = this, a2 = (void 0 === t3 && (t3 = []), r2);
        if (this.tokens.links) {
          var D2 = Object.keys(this.tokens.links);
          if (0 < D2.length)
            for (; null != (n3 = this.tokenizer.rules.inline.reflinkSearch.exec(a2)); )
              D2.includes(n3[0].slice(n3[0].lastIndexOf("[") + 1, -1)) && (a2 = a2.slice(0, n3.index) + "[" + E("a", n3[0].length - 2) + "]" + a2.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
        }
        for (; null != (n3 = this.tokenizer.rules.inline.blockSkip.exec(a2)); )
          a2 = a2.slice(0, n3.index) + "[" + E("a", n3[0].length - 2) + "]" + a2.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
        for (; null != (n3 = this.tokenizer.rules.inline.escapedEmSt.exec(a2)); )
          a2 = a2.slice(0, n3.index + n3[0].length - 2) + "++" + a2.slice(this.tokenizer.rules.inline.escapedEmSt.lastIndex), this.tokenizer.rules.inline.escapedEmSt.lastIndex--;
        for (; r2; )
          if (s2 || (l2 = ""), s2 = false, !(this.options.extensions && this.options.extensions.inline && this.options.extensions.inline.some(function(e4) {
            return !!(u3 = e4.call({ lexer: o2 }, r2, t3)) && (r2 = r2.substring(u3.raw.length), t3.push(u3), true);
          }))) {
            if (u3 = this.tokenizer.escape(r2))
              r2 = r2.substring(u3.raw.length), t3.push(u3);
            else if (u3 = this.tokenizer.tag(r2))
              r2 = r2.substring(u3.raw.length), (e3 = t3[t3.length - 1]) && "text" === u3.type && "text" === e3.type ? (e3.raw += u3.raw, e3.text += u3.text) : t3.push(u3);
            else if (u3 = this.tokenizer.link(r2))
              r2 = r2.substring(u3.raw.length), t3.push(u3);
            else if (u3 = this.tokenizer.reflink(r2, this.tokens.links))
              r2 = r2.substring(u3.raw.length), (e3 = t3[t3.length - 1]) && "text" === u3.type && "text" === e3.type ? (e3.raw += u3.raw, e3.text += u3.text) : t3.push(u3);
            else if (u3 = this.tokenizer.emStrong(r2, a2, l2))
              r2 = r2.substring(u3.raw.length), t3.push(u3);
            else if (u3 = this.tokenizer.codespan(r2))
              r2 = r2.substring(u3.raw.length), t3.push(u3);
            else if (u3 = this.tokenizer.br(r2))
              r2 = r2.substring(u3.raw.length), t3.push(u3);
            else if (u3 = this.tokenizer.del(r2))
              r2 = r2.substring(u3.raw.length), t3.push(u3);
            else if (u3 = this.tokenizer.autolink(r2, y))
              r2 = r2.substring(u3.raw.length), t3.push(u3);
            else if (!this.state.inLink && (u3 = this.tokenizer.url(r2, y)))
              r2 = r2.substring(u3.raw.length), t3.push(u3);
            else if (i2 = r2, this.options.extensions && this.options.extensions.startInline && !function() {
              var t4 = 1 / 0, u4 = r2.slice(1), n4 = void 0;
              o2.options.extensions.startInline.forEach(function(e4) {
                "number" == typeof (n4 = e4.call({ lexer: this }, u4)) && 0 <= n4 && (t4 = Math.min(t4, n4));
              }), t4 < 1 / 0 && 0 <= t4 && (i2 = r2.substring(0, t4 + 1));
            }(), u3 = this.tokenizer.inlineText(i2, L))
              r2 = r2.substring(u3.raw.length), "_" !== u3.raw.slice(-1) && (l2 = u3.raw.slice(-1)), s2 = true, (e3 = t3[t3.length - 1]) && "text" === e3.type ? (e3.raw += u3.raw, e3.text += u3.text) : t3.push(u3);
            else if (r2) {
              var c2 = "Infinite loop on byte: " + r2.charCodeAt(0);
              if (this.options.silent) {
                formatAppLog("error", "at uni_modules/mp-html/plugins/markdown/marked.min.js:6", c2);
                break;
              }
              throw new Error(c2);
            }
          }
        return t3;
      }, n2 = u2, t2 = [{ key: "rules", get: function() {
        return { block: B, inline: w };
      } }], (e2 = null) && i(n2.prototype, e2), t2 && i(n2, t2), Object.defineProperty(n2, "prototype", { writable: false }), u2;
    }(), _ = function() {
      function e2(e3) {
        this.options = e3 || r.defaults;
      }
      var t2 = e2.prototype;
      return t2.code = function(e3, t3, u2) {
        var n2, t3 = (t3 || "").match(/\S*/)[0];
        return this.options.highlight && null != (n2 = this.options.highlight(e3, t3)) && n2 !== e3 && (u2 = true, e3 = n2), e3 = e3.replace(/\n$/, "") + "\n", t3 ? '<pre><code class="' + this.options.langPrefix + A(t3) + '">' + (u2 ? e3 : A(e3, true)) + "</code></pre>\n" : "<pre><code>" + (u2 ? e3 : A(e3, true)) + "</code></pre>\n";
      }, t2.blockquote = function(e3) {
        return "<blockquote>\n" + e3 + "</blockquote>\n";
      }, t2.html = function(e3) {
        return e3;
      }, t2.heading = function(e3, t3, u2, n2) {
        return this.options.headerIds ? "<h" + t3 + ' id="' + (this.options.headerPrefix + n2.slug(u2)) + '">' + e3 + "</h" + t3 + ">\n" : "<h" + t3 + ">" + e3 + "</h" + t3 + ">\n";
      }, t2.hr = function() {
        return this.options.xhtml ? "<hr/>\n" : "<hr>\n";
      }, t2.list = function(e3, t3, u2) {
        var n2 = t3 ? "ol" : "ul";
        return "<" + n2 + (t3 && 1 !== u2 ? ' start="' + u2 + '"' : "") + ">\n" + e3 + "</" + n2 + ">\n";
      }, t2.listitem = function(e3) {
        return "<li>" + e3 + "</li>\n";
      }, t2.checkbox = function(e3) {
        return "<input " + (e3 ? 'checked="" ' : "") + 'disabled="" type="checkbox"' + (this.options.xhtml ? " /" : "") + "> ";
      }, t2.paragraph = function(e3) {
        return "<p>" + e3 + "</p>\n";
      }, t2.table = function(e3, t3) {
        return "<table>\n<thead>\n" + e3 + "</thead>\n" + (t3 = t3 && "<tbody>" + t3 + "</tbody>") + "</table>\n";
      }, t2.tablerow = function(e3) {
        return "<tr>\n" + e3 + "</tr>\n";
      }, t2.tablecell = function(e3, t3) {
        var u2 = t3.header ? "th" : "td";
        return (t3.align ? "<" + u2 + ' align="' + t3.align + '">' : "<" + u2 + ">") + e3 + "</" + u2 + ">\n";
      }, t2.strong = function(e3) {
        return "<strong>" + e3 + "</strong>";
      }, t2.em = function(e3) {
        return "<em>" + e3 + "</em>";
      }, t2.codespan = function(e3) {
        return "<code>" + e3 + "</code>";
      }, t2.br = function() {
        return this.options.xhtml ? "<br/>" : "<br>";
      }, t2.del = function(e3) {
        return "<del>" + e3 + "</del>";
      }, t2.link = function(e3, t3, u2) {
        return null === (e3 = f(this.options.sanitize, this.options.baseUrl, e3)) ? u2 : (e3 = '<a href="' + e3 + '"', t3 && (e3 += ' title="' + t3 + '"'), e3 + ">" + u2 + "</a>");
      }, t2.image = function(e3, t3, u2) {
        return null === (e3 = f(this.options.sanitize, this.options.baseUrl, e3)) ? u2 : (e3 = '<img src="' + e3 + '" alt="' + u2 + '"', t3 && (e3 += ' title="' + t3 + '"'), e3 + (this.options.xhtml ? "/>" : ">"));
      }, t2.text = function(e3) {
        return e3;
      }, e2;
    }(), z = function() {
      function e2() {
      }
      var t2 = e2.prototype;
      return t2.strong = function(e3) {
        return e3;
      }, t2.em = function(e3) {
        return e3;
      }, t2.codespan = function(e3) {
        return e3;
      }, t2.del = function(e3) {
        return e3;
      }, t2.html = function(e3) {
        return e3;
      }, t2.text = function(e3) {
        return e3;
      }, t2.link = function(e3, t3, u2) {
        return "" + u2;
      }, t2.image = function(e3, t3, u2) {
        return "" + u2;
      }, t2.br = function() {
        return "";
      }, e2;
    }(), $ = function() {
      function e2() {
        this.seen = {};
      }
      var t2 = e2.prototype;
      return t2.serialize = function(e3) {
        return e3.toLowerCase().trim().replace(/<[!\/a-z].*?>/gi, "").replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, "").replace(/\s/g, "-");
      }, t2.getNextSafeSlug = function(e3, t3) {
        var u2 = e3, n2 = 0;
        if (this.seen.hasOwnProperty(u2))
          for (n2 = this.seen[e3]; u2 = e3 + "-" + ++n2, this.seen.hasOwnProperty(u2); )
            ;
        return t3 || (this.seen[e3] = n2, this.seen[u2] = 0), u2;
      }, t2.slug = function(e3, t3) {
        void 0 === t3 && (t3 = {});
        e3 = this.serialize(e3);
        return this.getNextSafeSlug(e3, t3.dryrun);
      }, e2;
    }(), S = function() {
      function u2(e3) {
        this.options = e3 || r.defaults, this.options.renderer = this.options.renderer || new _(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.textRenderer = new z(), this.slugger = new $();
      }
      u2.parse = function(e3, t2) {
        return new u2(t2).parse(e3);
      }, u2.parseInline = function(e3, t2) {
        return new u2(t2).parseInline(e3);
      };
      var e2 = u2.prototype;
      return e2.parse = function(e3, t2) {
        void 0 === t2 && (t2 = true);
        for (var u3, n2, r2, i2, s2, l2, o2, a2, D2, c2, h2, p2, f2, g2, F2, A2, k2 = "", d2 = e3.length, C2 = 0; C2 < d2; C2++)
          if (a2 = e3[C2], this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[a2.type] && (false !== (A2 = this.options.extensions.renderers[a2.type].call({ parser: this }, a2)) || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "paragraph", "text"].includes(a2.type)))
            k2 += A2 || "";
          else
            switch (a2.type) {
              case "space":
                continue;
              case "hr":
                k2 += this.renderer.hr();
                continue;
              case "heading":
                k2 += this.renderer.heading(this.parseInline(a2.tokens), a2.depth, x(this.parseInline(a2.tokens, this.textRenderer)), this.slugger);
                continue;
              case "code":
                k2 += this.renderer.code(a2.text, a2.lang, a2.escaped);
                continue;
              case "table":
                for (l2 = D2 = "", r2 = a2.header.length, u3 = 0; u3 < r2; u3++)
                  l2 += this.renderer.tablecell(this.parseInline(a2.header[u3].tokens), { header: true, align: a2.align[u3] });
                for (D2 += this.renderer.tablerow(l2), o2 = "", r2 = a2.rows.length, u3 = 0; u3 < r2; u3++) {
                  for (l2 = "", i2 = (s2 = a2.rows[u3]).length, n2 = 0; n2 < i2; n2++)
                    l2 += this.renderer.tablecell(this.parseInline(s2[n2].tokens), { header: false, align: a2.align[n2] });
                  o2 += this.renderer.tablerow(l2);
                }
                k2 += this.renderer.table(D2, o2);
                continue;
              case "blockquote":
                o2 = this.parse(a2.tokens), k2 += this.renderer.blockquote(o2);
                continue;
              case "list":
                for (D2 = a2.ordered, E2 = a2.start, c2 = a2.loose, r2 = a2.items.length, o2 = "", u3 = 0; u3 < r2; u3++)
                  f2 = (p2 = a2.items[u3]).checked, g2 = p2.task, h2 = "", p2.task && (F2 = this.renderer.checkbox(f2), c2 ? 0 < p2.tokens.length && "paragraph" === p2.tokens[0].type ? (p2.tokens[0].text = F2 + " " + p2.tokens[0].text, p2.tokens[0].tokens && 0 < p2.tokens[0].tokens.length && "text" === p2.tokens[0].tokens[0].type && (p2.tokens[0].tokens[0].text = F2 + " " + p2.tokens[0].tokens[0].text)) : p2.tokens.unshift({ type: "text", text: F2 }) : h2 += F2), h2 += this.parse(p2.tokens, c2), o2 += this.renderer.listitem(h2, g2, f2);
                k2 += this.renderer.list(o2, D2, E2);
                continue;
              case "html":
                k2 += this.renderer.html(a2.text);
                continue;
              case "paragraph":
                k2 += this.renderer.paragraph(this.parseInline(a2.tokens));
                continue;
              case "text":
                for (o2 = a2.tokens ? this.parseInline(a2.tokens) : a2.text; C2 + 1 < d2 && "text" === e3[C2 + 1].type; )
                  o2 += "\n" + ((a2 = e3[++C2]).tokens ? this.parseInline(a2.tokens) : a2.text);
                k2 += t2 ? this.renderer.paragraph(o2) : o2;
                continue;
              default:
                var E2 = 'Token with "' + a2.type + '" type was not found.';
                if (this.options.silent)
                  return void formatAppLog("error", "at uni_modules/mp-html/plugins/markdown/marked.min.js:6", E2);
                throw new Error(E2);
            }
        return k2;
      }, e2.parseInline = function(e3, t2) {
        t2 = t2 || this.renderer;
        for (var u3, n2, r2 = "", i2 = e3.length, s2 = 0; s2 < i2; s2++)
          if (u3 = e3[s2], this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[u3.type] && (false !== (n2 = this.options.extensions.renderers[u3.type].call({ parser: this }, u3)) || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(u3.type)))
            r2 += n2 || "";
          else
            switch (u3.type) {
              case "escape":
                r2 += t2.text(u3.text);
                break;
              case "html":
                r2 += t2.html(u3.text);
                break;
              case "link":
                r2 += t2.link(u3.href, u3.title, this.parseInline(u3.tokens, t2));
                break;
              case "image":
                r2 += t2.image(u3.href, u3.title, u3.text);
                break;
              case "strong":
                r2 += t2.strong(this.parseInline(u3.tokens, t2));
                break;
              case "em":
                r2 += t2.em(this.parseInline(u3.tokens, t2));
                break;
              case "codespan":
                r2 += t2.codespan(u3.text);
                break;
              case "br":
                r2 += t2.br();
                break;
              case "del":
                r2 += t2.del(this.parseInline(u3.tokens, t2));
                break;
              case "text":
                r2 += t2.text(u3.text);
                break;
              default:
                var l2 = 'Token with "' + u3.type + '" type was not found.';
                if (this.options.silent)
                  return void formatAppLog("error", "at uni_modules/mp-html/plugins/markdown/marked.min.js:6", l2);
                throw new Error(l2);
            }
        return r2;
      }, u2;
    }(), T = function() {
      function e2(e3) {
        this.options = e3 || r.defaults;
      }
      var t2 = e2.prototype;
      return t2.preprocess = function(e3) {
        return e3;
      }, t2.postprocess = function(e3) {
        return e3;
      }, e2;
    }();
    function R(f2, g2) {
      return function(e2, u2, n2) {
        "function" == typeof u2 && (n2 = u2, u2 = null);
        var r2, i2, s2, t2 = F({}, u2), l2 = (u2 = F({}, I.defaults, t2), r2 = u2.silent, i2 = u2.async, s2 = n2, function(e3) {
          var t3;
          if (e3.message += "\nPlease report this to https://github.com/markedjs/marked.", r2)
            return t3 = "<p>An error occurred:</p><pre>" + A(e3.message + "", true) + "</pre>", i2 ? Promise.resolve(t3) : s2 ? void s2(null, t3) : t3;
          if (i2)
            return Promise.reject(e3);
          if (!s2)
            throw e3;
          s2(e3);
        });
        if (null == e2)
          return l2(new Error("marked(): input parameter is undefined or null"));
        if ("string" != typeof e2)
          return l2(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(e2) + ", string expected"));
        if ((t2 = u2) && t2.sanitize && !t2.silent && formatAppLog("warn", "at uni_modules/mp-html/plugins/markdown/marked.min.js:6", "marked(): sanitize and sanitizer parameters are deprecated since version 0.7.0, should not be used and will be removed in the future. Read more here: https://marked.js.org/#/USING_ADVANCED.md#options"), u2.hooks && (u2.hooks.options = u2), n2) {
          var o2, a2 = u2.highlight;
          try {
            u2.hooks && (e2 = u2.hooks.preprocess(e2)), o2 = f2(e2, u2);
          } catch (e3) {
            return l2(e3);
          }
          var D2, c2 = function(t3) {
            var e3;
            if (!t3)
              try {
                u2.walkTokens && I.walkTokens(o2, u2.walkTokens), e3 = g2(o2, u2), u2.hooks && (e3 = u2.hooks.postprocess(e3));
              } catch (e4) {
                t3 = e4;
              }
            return u2.highlight = a2, t3 ? l2(t3) : n2(null, e3);
          };
          return !a2 || a2.length < 3 ? c2() : (delete u2.highlight, o2.length ? (D2 = 0, I.walkTokens(o2, function(u3) {
            "code" === u3.type && (D2++, setTimeout(function() {
              a2(u3.text, u3.lang, function(e3, t3) {
                if (e3)
                  return c2(e3);
                null != t3 && t3 !== u3.text && (u3.text = t3, u3.escaped = true), 0 === --D2 && c2();
              });
            }, 0));
          }), void (0 === D2 && c2())) : c2());
        }
        if (u2.async)
          return Promise.resolve(u2.hooks ? u2.hooks.preprocess(e2) : e2).then(function(e3) {
            return f2(e3, u2);
          }).then(function(e3) {
            return u2.walkTokens ? Promise.all(I.walkTokens(e3, u2.walkTokens)).then(function() {
              return e3;
            }) : e3;
          }).then(function(e3) {
            return g2(e3, u2);
          }).then(function(e3) {
            return u2.hooks ? u2.hooks.postprocess(e3) : e3;
          }).catch(l2);
        try {
          u2.hooks && (e2 = u2.hooks.preprocess(e2));
          var h2 = f2(e2, u2), p2 = (u2.walkTokens && I.walkTokens(h2, u2.walkTokens), g2(h2, u2));
          return p2 = u2.hooks ? u2.hooks.postprocess(p2) : p2;
        } catch (e3) {
          return l2(e3);
        }
      };
    }
    function I(e2, t2, u2) {
      return R(v.lex, S.parse)(e2, t2, u2);
    }
    T.passThroughHooks = /* @__PURE__ */ new Set(["preprocess", "postprocess"]), I.options = I.setOptions = function(e2) {
      return I.defaults = F({}, I.defaults, e2), e2 = I.defaults, r.defaults = e2, I;
    }, I.getDefaults = e, I.defaults = r.defaults, I.use = function() {
      for (var D2 = I.defaults.extensions || { renderers: {}, childTokens: {} }, e2 = arguments.length, t2 = new Array(e2), u2 = 0; u2 < e2; u2++)
        t2[u2] = arguments[u2];
      t2.forEach(function(s2) {
        var u3, e3 = F({}, s2);
        if (e3.async = I.defaults.async || e3.async || false, s2.extensions && (s2.extensions.forEach(function(r3) {
          if (!r3.name)
            throw new Error("extension name required");
          var i2;
          if (r3.renderer && (i2 = D2.renderers[r3.name], D2.renderers[r3.name] = i2 ? function() {
            for (var e4 = arguments.length, t4 = new Array(e4), u4 = 0; u4 < e4; u4++)
              t4[u4] = arguments[u4];
            var n3 = r3.renderer.apply(this, t4);
            return n3 = false === n3 ? i2.apply(this, t4) : n3;
          } : r3.renderer), r3.tokenizer) {
            if (!r3.level || "block" !== r3.level && "inline" !== r3.level)
              throw new Error("extension level must be 'block' or 'inline'");
            D2[r3.level] ? D2[r3.level].unshift(r3.tokenizer) : D2[r3.level] = [r3.tokenizer], r3.start && ("block" === r3.level ? D2.startBlock ? D2.startBlock.push(r3.start) : D2.startBlock = [r3.start] : "inline" === r3.level && (D2.startInline ? D2.startInline.push(r3.start) : D2.startInline = [r3.start]));
          }
          r3.childTokens && (D2.childTokens[r3.name] = r3.childTokens);
        }), e3.extensions = D2), s2.renderer) {
          var t3, l2 = I.defaults.renderer || new _();
          for (t3 in s2.renderer)
            !function(r3) {
              var i2 = l2[r3];
              l2[r3] = function() {
                for (var e4 = arguments.length, t4 = new Array(e4), u4 = 0; u4 < e4; u4++)
                  t4[u4] = arguments[u4];
                var n3 = s2.renderer[r3].apply(l2, t4);
                return n3 = false === n3 ? i2.apply(l2, t4) : n3;
              };
            }(t3);
          e3.renderer = l2;
        }
        if (s2.tokenizer) {
          var n2, o2 = I.defaults.tokenizer || new b();
          for (n2 in s2.tokenizer)
            !function(r3) {
              var i2 = o2[r3];
              o2[r3] = function() {
                for (var e4 = arguments.length, t4 = new Array(e4), u4 = 0; u4 < e4; u4++)
                  t4[u4] = arguments[u4];
                var n3 = s2.tokenizer[r3].apply(o2, t4);
                return n3 = false === n3 ? i2.apply(o2, t4) : n3;
              };
            }(n2);
          e3.tokenizer = o2;
        }
        if (s2.hooks) {
          var r2, a2 = I.defaults.hooks || new T();
          for (r2 in s2.hooks)
            !function(r3) {
              var i2 = a2[r3];
              T.passThroughHooks.has(r3) ? a2[r3] = function(e4) {
                return I.defaults.async ? Promise.resolve(s2.hooks[r3].call(a2, e4)).then(function(e5) {
                  return i2.call(a2, e5);
                }) : (e4 = s2.hooks[r3].call(a2, e4), i2.call(a2, e4));
              } : a2[r3] = function() {
                for (var e4 = arguments.length, t4 = new Array(e4), u4 = 0; u4 < e4; u4++)
                  t4[u4] = arguments[u4];
                var n3 = s2.hooks[r3].apply(a2, t4);
                return n3 = false === n3 ? i2.apply(a2, t4) : n3;
              };
            }(r2);
          e3.hooks = a2;
        }
        s2.walkTokens && (u3 = I.defaults.walkTokens, e3.walkTokens = function(e4) {
          var t4 = [];
          return t4.push(s2.walkTokens.call(this, e4)), t4 = u3 ? t4.concat(u3.call(this, e4)) : t4;
        }), I.setOptions(e3);
      });
    }, I.walkTokens = function(e2, l2) {
      for (var o2, a2 = [], t2 = D(e2); !(o2 = t2()).done; )
        !function() {
          var t3 = o2.value;
          switch (a2 = a2.concat(l2.call(I, t3)), t3.type) {
            case "table":
              for (var e3 = D(t3.header); !(u2 = e3()).done; ) {
                var u2 = u2.value;
                a2 = a2.concat(I.walkTokens(u2.tokens, l2));
              }
              for (var n2, r2 = D(t3.rows); !(n2 = r2()).done; )
                for (var i2 = D(n2.value); !(s2 = i2()).done; ) {
                  var s2 = s2.value;
                  a2 = a2.concat(I.walkTokens(s2.tokens, l2));
                }
              break;
            case "list":
              a2 = a2.concat(I.walkTokens(t3.items, l2));
              break;
            default:
              I.defaults.extensions && I.defaults.extensions.childTokens && I.defaults.extensions.childTokens[t3.type] ? I.defaults.extensions.childTokens[t3.type].forEach(function(e4) {
                a2 = a2.concat(I.walkTokens(t3[e4], l2));
              }) : t3.tokens && (a2 = a2.concat(I.walkTokens(t3.tokens, l2)));
          }
        }();
      return a2;
    }, I.parseInline = R(v.lexInline, S.parseInline), I.Parser = S, I.parser = S.parse, I.Renderer = _, I.TextRenderer = z, I.Lexer = v, I.lexer = v.lex, I.Tokenizer = b, I.Slugger = $, I.Hooks = T;
    var k = (I.parse = I).options, Q = I.setOptions, U = I.use, M = I.walkTokens, N = I.parseInline, H = I, X = S.parse, G = v.lex;
    r.Hooks = T, r.Lexer = v, r.Parser = S, r.Renderer = _, r.Slugger = $, r.TextRenderer = z, r.Tokenizer = b, r.getDefaults = e, r.lexer = G, r.marked = I, r.options = k, r.parse = H, r.parseInline = N, r.parser = X, r.setOptions = Q, r.use = U, r.walkTokens = M;
  });
  const root = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : {};
  const exported = root.marked || {};
  const marked = exported.marked || exported;
  let index = 0;
  function Markdown(vm) {
    this.vm = vm;
    vm._ids = {};
  }
  Markdown.prototype.onUpdate = function(content) {
    if (this.vm.properties.markdown) {
      content = content.replace(/\*\*([^*]+)\*\*([，。！？；：])/g, "**$1**&#8203;$2");
      return marked(content);
    }
  };
  Markdown.prototype.onParse = function(node2, vm) {
    if (vm.options.markdown) {
      if (vm.options.useAnchor && node2.attrs && /[\u4e00-\u9fa5]/.test(node2.attrs.id)) {
        const id = "t" + index++;
        this.vm._ids[node2.attrs.id] = id;
        node2.attrs.id = id;
      }
      if (node2.name === "p" || node2.name === "table" || node2.name === "tr" || node2.name === "th" || node2.name === "td" || node2.name === "blockquote" || node2.name === "pre" || node2.name === "code") {
        node2.attrs.class = `md-${node2.name} ${node2.attrs.class || ""}`;
      }
    }
  };
  const plugins = [Markdown];
  const _sfc_main$2 = {
    name: "mp-html",
    data() {
      return {
        nodes: []
      };
    },
    props: {
      markdown: Boolean,
      containerStyle: {
        type: String,
        default: ""
      },
      content: {
        type: String,
        default: ""
      },
      copyLink: {
        type: [Boolean, String],
        default: true
      },
      domain: String,
      errorImg: {
        type: String,
        default: ""
      },
      lazyLoad: {
        type: [Boolean, String],
        default: false
      },
      loadingImg: {
        type: String,
        default: ""
      },
      pauseVideo: {
        type: [Boolean, String],
        default: true
      },
      previewImg: {
        type: [Boolean, String],
        default: true
      },
      scrollTable: [Boolean, String],
      selectable: [Boolean, String],
      setTitle: {
        type: [Boolean, String],
        default: true
      },
      showImgMenu: {
        type: [Boolean, String],
        default: true
      },
      tagStyle: Object,
      useAnchor: [Boolean, Number]
    },
    computed: {
      properties() {
        return this.$props;
      }
    },
    emits: ["load", "ready", "imgtap", "linktap", "play", "error"],
    components: {
      node
    },
    watch: {
      content(content) {
        this.setContent(content);
      }
    },
    created() {
      this.plugins = [];
      for (let i = plugins.length; i--; ) {
        this.plugins.push(new plugins[i](this));
      }
    },
    mounted() {
      if (this.content && !this.nodes.length) {
        this.setContent(this.content);
      }
    },
    beforeDestroy() {
      this._hook("onDetached");
    },
    methods: {
      /**
       * @description 将锚点跳转的范围限定在一个 scroll-view 内
       * @param {Object} page scroll-view 所在页面的示例
       * @param {String} selector scroll-view 的选择器
       * @param {String} scrollTop scroll-view scroll-top 属性绑定的变量名
       */
      in(page, selector, scrollTop) {
        if (page && selector && scrollTop) {
          this._in = {
            page,
            selector,
            scrollTop
          };
        }
      },
      /**
       * @description 锚点跳转
       * @param {String} id 要跳转的锚点 id
       * @param {Number} offset 跳转位置的偏移量
       * @returns {Promise}
       */
      navigateTo(id, offset) {
        return new Promise((resolve, reject) => {
          if (!this.useAnchor) {
            reject(Error("Anchor is disabled"));
            return;
          }
          offset = offset || parseInt(this.useAnchor) || 0;
          let deep = " ";
          const selector = uni.createSelectorQuery().in(this._in ? this._in.page : this).select((this._in ? this._in.selector : "._root") + (id ? `${deep}#${id}` : "")).boundingClientRect();
          if (this._in) {
            selector.select(this._in.selector).scrollOffset().select(this._in.selector).boundingClientRect();
          } else {
            selector.selectViewport().scrollOffset();
          }
          selector.exec((res) => {
            if (!res[0]) {
              reject(Error("Label not found"));
              return;
            }
            const scrollTop = res[1].scrollTop + res[0].top - (res[2] ? res[2].top : 0) + offset;
            if (this._in) {
              this._in.page[this._in.scrollTop] = scrollTop;
            } else {
              uni.pageScrollTo({
                scrollTop,
                duration: 300
              });
            }
            resolve();
          });
        });
      },
      /**
       * @description 获取文本内容
       * @return {String}
       */
      getText(nodes) {
        let text = "";
        (function traversal(nodes2) {
          for (let i = 0; i < nodes2.length; i++) {
            const node2 = nodes2[i];
            if (node2.type === "text") {
              text += node2.text.replace(/&amp;/g, "&");
            } else if (node2.name === "br") {
              text += "\n";
            } else {
              const isBlock = node2.name === "p" || node2.name === "div" || node2.name === "tr" || node2.name === "li" || node2.name[0] === "h" && node2.name[1] > "0" && node2.name[1] < "7";
              if (isBlock && text && text[text.length - 1] !== "\n") {
                text += "\n";
              }
              if (node2.children) {
                traversal(node2.children);
              }
              if (isBlock && text[text.length - 1] !== "\n") {
                text += "\n";
              } else if (node2.name === "td" || node2.name === "th") {
                text += "	";
              }
            }
          }
        })(nodes || this.nodes);
        return text;
      },
      /**
       * @description 获取内容大小和位置
       * @return {Promise}
       */
      getRect() {
        return new Promise((resolve, reject) => {
          uni.createSelectorQuery().in(this).select("#_root").boundingClientRect().exec((res) => res[0] ? resolve(res[0]) : reject(Error("Root label not found")));
        });
      },
      /**
       * @description 暂停播放媒体
       */
      pauseMedia() {
        for (let i = (this._videos || []).length; i--; ) {
          this._videos[i].pause();
        }
        const command = 'for(var e=document.getElementsByTagName("video"),i=e.length;i--;)e[i].pause()';
        let page = this.$parent;
        while (!page.$scope)
          page = page.$parent;
        page.$scope.$getAppWebview().evalJS(command);
      },
      /**
       * @description 设置媒体播放速率
       * @param {Number} rate 播放速率
       */
      setPlaybackRate(rate) {
        this.playbackRate = rate;
        for (let i = (this._videos || []).length; i--; ) {
          this._videos[i].playbackRate(rate);
        }
        const command = 'for(var e=document.getElementsByTagName("video"),i=e.length;i--;)e[i].playbackRate=' + rate;
        let page = this.$parent;
        while (!page.$scope)
          page = page.$parent;
        page.$scope.$getAppWebview().evalJS(command);
      },
      /**
       * @description 设置内容
       * @param {String} content html 内容
       * @param {Boolean} append 是否在尾部追加
       */
      setContent(content, append) {
        if (!append || !this.imgList) {
          this.imgList = [];
        }
        const nodes = new Parser(this).parse(content);
        this.$set(this, "nodes", append ? (this.nodes || []).concat(nodes) : nodes);
        this._videos = [];
        this.$nextTick(() => {
          this._hook("onLoad");
          this.$emit("load");
        });
        if (this.lazyLoad || this.imgList._unloadimgs < this.imgList.length / 2) {
          let height = 0;
          const callback = (rect) => {
            if (!rect || !rect.height)
              rect = {};
            if (rect.height === height) {
              this.$emit("ready", rect);
            } else {
              height = rect.height;
              setTimeout(() => {
                this.getRect().then(callback).catch(callback);
              }, 350);
            }
          };
          this.getRect().then(callback).catch(callback);
        } else {
          if (!this.imgList._unloadimgs) {
            this.getRect().then((rect) => {
              this.$emit("ready", rect);
            }).catch(() => {
              this.$emit("ready", {});
            });
          }
        }
      },
      /**
       * @description 调用插件钩子函数
       */
      _hook(name) {
        for (let i = plugins.length; i--; ) {
          if (this.plugins[i][name]) {
            this.plugins[i][name]();
          }
        }
      }
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_node = vue.resolveComponent("node");
    return vue.openBlock(), vue.createElementBlock(
      "view",
      {
        id: "_root",
        class: vue.normalizeClass(($props.selectable ? "_select " : "") + "_root"),
        style: vue.normalizeStyle($props.containerStyle)
      },
      [
        !$data.nodes[0] ? vue.renderSlot(_ctx.$slots, "default", { key: 0 }, void 0, true) : (vue.openBlock(), vue.createBlock(_component_node, {
          key: 1,
          childs: $data.nodes,
          opts: [$props.lazyLoad, $props.loadingImg, $props.errorImg, $props.showImgMenu, $props.selectable],
          name: "span"
        }, null, 8, ["childs", "opts"]))
      ],
      6
      /* CLASS, STYLE */
    );
  }
  const __easycom_0 = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-a290f043"], ["__file", "D:/AI/AI_TV/frontend/uni_modules/mp-html/components/mp-html/mp-html.vue"]]);
  async function readTextContent(src, adapter) {
    if (!src) {
      return "";
    }
    const isRemote = /^https?:\/\//i.test(src);
    if (!isRemote && adapter && typeof adapter.read === "function") {
      return adapter.read(src);
    }
    if (!isRemote && typeof uni !== "undefined" && typeof uni.getFileSystemManager === "function") {
      return readLocalText(src);
    }
    return requestText(src);
  }
  function readLocalText(filePath) {
    return new Promise((resolve, reject) => {
      const manager = uni.getFileSystemManager();
      manager.readFile({
        filePath: normalizeLocalPath$1(filePath),
        encoding: "utf8",
        success: (res) => resolve(res.data),
        fail: (error) => reject(error)
      });
    });
  }
  function requestText(url) {
    return new Promise((resolve, reject) => {
      uni.request({
        url,
        success: (res) => {
          if (res.statusCode === 200) {
            const data = res.data;
            resolve(typeof data === "string" ? data : JSON.stringify(data));
            return;
          }
          reject(new Error(`读取失败: ${res.statusCode}`));
        },
        fail: (error) => reject(error)
      });
    });
  }
  function normalizeLocalPath$1(filePath) {
    return String(filePath || "").replace(/^file:\/\//, "");
  }
  const _sfc_main$1 = {
    components: {
      MpHtml: __easycom_0
    },
    data() {
      return {
        source: "",
        title: "",
        content: "",
        contentDomain: "",
        loading: false,
        error: ""
      };
    },
    /**
     * AI:读取路由参数并加载内容。
     * @param {{src?: string, title?: string}} query AI:路由参数。
     * @returns {void} AI:无返回值。
     */
    onLoad(query) {
      const source = query && query.src ? decodeURIComponent(query.src) : "";
      const title = query && query.title ? decodeURIComponent(query.title) : "";
      this.source = source;
      this.title = title;
      if (!source) {
        this.error = "缺少阅读地址";
        return;
      }
      this.loadContent();
    },
    methods: {
      /**
       * AI:加载图文文本内容。
       * @returns {void} AI:无返回值。
       */
      loadContent() {
        this.loading = true;
        this.error = "";
        this.contentDomain = this.computeContentDomain();
        readTextContent(this.source, createUniFileAdapter()).then((text) => {
          this.content = text || "";
        }).catch(() => {
          this.error = "内容加载失败";
        }).finally(() => {
          this.loading = false;
        });
      },
      /**
       * AI:返回上一页。
       * @returns {void} AI:无返回值。
       */
      goBack() {
        uni.navigateBack();
      },
      /**
       * AI:计算 Markdown 相对资源的基础域名。
       * @returns {string} AI:基础域名或空字符串。
       */
      computeContentDomain() {
        const source = String(this.source || "");
        if (!/^https?:\/\//i.test(source)) {
          return "";
        }
        const match = source.match(/^(https?:\/\/[^/]+)(\/.*)?$/i);
        if (!match) {
          return "";
        }
        const origin = match[1];
        const pathname = match[2] || "/";
        const basePath = pathname.replace(/\/[^/]*$/, "/");
        return `${origin}${basePath}`;
      }
    }
  };
  function createUniFileAdapter() {
    return {
      read(filePath) {
        return new Promise((resolve, reject) => {
          const manager = typeof uni !== "undefined" && typeof uni.getFileSystemManager === "function" ? uni.getFileSystemManager() : null;
          if (!manager || typeof manager.readFile !== "function") {
            reject(new Error("当前环境不支持本地读取"));
            return;
          }
          manager.readFile({
            filePath: normalizeLocalPath(filePath),
            encoding: "utf8",
            success: (res) => resolve(res.data),
            fail: (error) => reject(error)
          });
        });
      }
    };
  }
  function normalizeLocalPath(filePath) {
    return String(filePath || "").replace(/^file:\/\//, "");
  }
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_mp_html = resolveEasycom(vue.resolveDynamicComponent("mp-html"), __easycom_0);
    return vue.openBlock(), vue.createElementBlock("view", { class: "app-page" }, [
      vue.createElementVNode("view", { class: "header hero" }, [
        vue.createElementVNode(
          "text",
          { class: "title" },
          vue.toDisplayString($data.title || "图文"),
          1
          /* TEXT */
        ),
        vue.createElementVNode("text", { class: "subtitle muted" }, "阅读内容")
      ]),
      $data.loading ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "loading muted"
      }, "加载中...")) : $data.error ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "error-card card"
      }, [
        vue.createElementVNode(
          "text",
          { class: "error-text" },
          vue.toDisplayString($data.error),
          1
          /* TEXT */
        )
      ])) : (vue.openBlock(), vue.createElementBlock("view", {
        key: 2,
        class: "content card"
      }, [
        $data.content ? (vue.openBlock(), vue.createBlock(_component_mp_html, {
          key: 0,
          class: "content-html",
          content: $data.content,
          markdown: true,
          selectable: true,
          "preview-img": true,
          domain: $data.contentDomain
        }, null, 8, ["content", "domain"])) : (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "placeholder muted"
        }, "暂无内容"))
      ])),
      vue.createElementVNode("view", { class: "actions" }, [
        vue.createElementVNode("button", {
          class: "btn btn-ghost back",
          size: "mini",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.goBack && $options.goBack(...args))
        }, "返回")
      ])
    ]);
  }
  const PagesReaderIndex = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__scopeId", "data-v-d1222e64"], ["__file", "D:/AI/AI_TV/frontend/pages/reader/index.vue"]]);
  __definePage("pages/latest/index", PagesLatestIndex);
  __definePage("pages/offline/index", PagesOfflineIndex);
  __definePage("pages/settings/index", PagesSettingsIndex);
  __definePage("pages/player/index", PagesPlayerIndex);
  __definePage("pages/reader/index", PagesReaderIndex);
  const _sfc_main = {
    onLaunch() {
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "D:/AI/AI_TV/frontend/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
