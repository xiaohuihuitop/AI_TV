var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
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
  var _a;
  function normalizeIndexItems(raw) {
    const items = Array.isArray(raw && raw.items) ? raw.items.slice() : [];
    items.sort((a, b2) => String(b2.published_at || "").localeCompare(String(a.published_at || "")));
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
       * @returns {void} AI:无返回值。
       */
      handleItemClick(item) {
        if (item.type === "article") {
          this.openArticle(item);
          return;
        }
        this.openVideo(item);
      },
      /**
       * AI:跳转到视频播放页。
       * @param {Object} item AI:视频条目。
       * @returns {void} AI:无返回值。
       */
      openVideo(item) {
        const src = this.resolveItemSource(item);
        if (!src) {
          uni.showToast({ title: "缺少播放地址", icon: "none" });
          return;
        }
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
       * @returns {void} AI:无返回值。
       */
      handleItemClick(item) {
        if (item.type === "article") {
          this.openArticle(item);
          return;
        }
        this.openVideo(item);
      },
      /**
       * AI:跳转到视频播放页。
       * @param {Object} item AI:视频条目。
       * @returns {void} AI:无返回值。
       */
      openVideo(item) {
        const src = this.resolveItemSource(item);
        if (!src) {
          uni.showToast({ title: "尚未下载完成", icon: "none" });
          return;
        }
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
        error: ""
      };
    },
    /**
     * AI:读取页面参数，初始化播放信息。
     * @param {{src?: string, title?: string}} query AI:路由参数。
     * @returns {void} AI:无返回值。
     */
    onLoad(query) {
      const source = query && query.src ? decodeURIComponent(query.src) : "";
      const title = query && query.title ? decodeURIComponent(query.title) : "";
      this.source = source;
      this.title = title;
      if (!source) {
        this.error = "缺少播放地址";
      }
    },
    methods: {
      /**
       * AI:返回上一页。
       * @returns {void} AI:无返回值。
       */
      goBack() {
        uni.navigateBack();
      }
    }
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "app-page" }, [
      vue.createElementVNode("view", { class: "header hero" }, [
        vue.createElementVNode(
          "text",
          { class: "title" },
          vue.toDisplayString($data.title || "播放"),
          1
          /* TEXT */
        ),
        vue.createElementVNode("text", { class: "subtitle muted" }, "视频播放预览")
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
        class: "video-shell card"
      }, [
        vue.createElementVNode("video", {
          class: "video-player",
          src: $data.source,
          controls: ""
        }, null, 8, ["src"])
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
                          vue.renderList(tbody.children, (tr, y2) => {
                            return vue.openBlock(), vue.createElementBlock(
                              vue.Fragment,
                              { key: y2 },
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
                                      vue.renderList(tr.children, (td, z2) => {
                                        return vue.openBlock(), vue.createElementBlock(
                                          "view",
                                          {
                                            key: z2,
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
                  vue.renderList(n.children, (n2, j2) => {
                    return vue.openBlock(), vue.createBlock(_component_node, {
                      key: j2,
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
      const j2 = str.indexOf(";", i + 3);
      let code;
      if (j2 === -1)
        break;
      if (str[i + 1] === "#") {
        code = parseInt((str[i + 2] === "x" ? "0" : "") + str.substring(i + 2, j2));
        if (!isNaN(code)) {
          str = str.substr(0, i) + String.fromCharCode(code) + str.substr(j2 + 1);
        }
      } else {
        code = str.substring(i + 1, j2);
        if (config.entities[code] || code === "amp" && amp) {
          str = str.substr(0, i) + (config.entities[code] || "&") + str.substr(j2 + 1);
        }
      }
      i = str.indexOf("&", i + 1);
    }
    return str;
  }
  function mergeNodes(nodes) {
    let i = nodes.length - 1;
    for (let j2 = i; j2 >= -1; j2--) {
      if (j2 === -1 || nodes[j2].c || !nodes[j2].name || nodes[j2].name !== "div" && nodes[j2].name !== "p" && nodes[j2].name[0] !== "h" || (nodes[j2].attrs.style || "").includes("inline")) {
        if (i - j2 >= 5) {
          nodes.splice(j2 + 1, i - j2, {
            name: "div",
            attrs: {},
            children: nodes.slice(j2 + 1, i + 1)
          });
        }
        i = j2 - 1;
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
          let j2 = value.indexOf("(") + 1;
          if (j2) {
            while (value[j2] === '"' || value[j2] === "'" || blankChar[value[j2]]) {
              j2++;
            }
            value = value.substr(0, j2) + this.getUrl(value.substr(j2));
          }
        } else if (value.includes("rpx")) {
          value = value.replace(/[0-9.]+\s*rpx/g, ($2) => parseFloat($2) * windowWidth / 750 + "px");
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
          for (let j2 = 0; j2 < trList[row - 1].children.length; j2++) {
            const td = trList[row - 1].children[j2];
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
  function L() {
    return { async: false, breaks: false, extensions: null, gfm: true, hooks: null, pedantic: false, renderer: null, silent: false, tokenizer: null, walkTokens: null };
  }
  var O = L();
  function G(l) {
    O = l;
  }
  var E = { exec: () => null };
  function h(l, e = "") {
    let t = typeof l == "string" ? l : l.source, n = { replace: (r, i) => {
      let s = typeof i == "string" ? i : i.source;
      return s = s.replace(m.caret, "$1"), t = t.replace(r, s), n;
    }, getRegex: () => new RegExp(t, e) };
    return n;
  }
  var m = { codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceTabs: /^\t+/, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] /, listReplaceTask: /^\[[ xX]\] +/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, unescapeTest: /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (l) => new RegExp(`^( {0,3}${l})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: (l) => new RegExp(`^ {0,${Math.min(3, l - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`), hrRegex: (l) => new RegExp(`^ {0,${Math.min(3, l - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`), fencesBeginRegex: (l) => new RegExp(`^ {0,${Math.min(3, l - 1)}}(?:\`\`\`|~~~)`), headingBeginRegex: (l) => new RegExp(`^ {0,${Math.min(3, l - 1)}}#`), htmlBeginRegex: (l) => new RegExp(`^ {0,${Math.min(3, l - 1)}}<(?:[a-z].*>|!--)`, "i") }, xe = /^(?:[ \t]*(?:\n|$))+/, be = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/, Re = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/, C = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/, Oe = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/, j = /(?:[*+-]|\d{1,9}[.)])/, se = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/, ie = h(se).replace(/bull/g, j).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex(), Te = h(se).replace(/bull/g, j).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(), F = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/, we = /^[^\n]+/, Q = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/, ye = h(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", Q).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(), Pe = h(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, j).getRegex(), v = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul", U = /<!--(?:-?>|[\s\S]*?(?:-->|$))/, Se = h("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", U).replace("tag", v).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(), oe = h(F).replace("hr", C).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v).getRegex(), $e = h(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", oe).getRegex(), K = { blockquote: $e, code: be, def: ye, fences: Re, heading: Oe, hr: C, html: Se, lheading: ie, list: Pe, newline: xe, paragraph: oe, table: E, text: we }, re = h("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", C).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v).getRegex(), _e = { ...K, lheading: Te, table: re, paragraph: h(F).replace("hr", C).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", re).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v).getRegex() }, Le = { ...K, html: h(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", U).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: E, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: h(F).replace("hr", C).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", ie).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() }, Me = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/, ze = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/, ae = /^( {2,}|\\)\n(?!\s*$)/, Ae = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/, D = /[\p{P}\p{S}]/u, W = /[\s\p{P}\p{S}]/u, le = /[^\s\p{P}\p{S}]/u, Ee = h(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, W).getRegex(), ue = /(?!~)[\p{P}\p{S}]/u, Ce = /(?!~)[\s\p{P}\p{S}]/u, Ie = /(?:[^\s\p{P}\p{S}]|~)/u, Be = /\[[^\[\]]*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)|`[^`]*?`|<(?! )[^<>]*?>/g, pe = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/, qe = h(pe, "u").replace(/punct/g, D).getRegex(), ve = h(pe, "u").replace(/punct/g, ue).getRegex(), ce = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)", De = h(ce, "gu").replace(/notPunctSpace/g, le).replace(/punctSpace/g, W).replace(/punct/g, D).getRegex(), He = h(ce, "gu").replace(/notPunctSpace/g, Ie).replace(/punctSpace/g, Ce).replace(/punct/g, ue).getRegex(), Ze = h("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, le).replace(/punctSpace/g, W).replace(/punct/g, D).getRegex(), Ge = h(/\\(punct)/, "gu").replace(/punct/g, D).getRegex(), Ne = h(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(), je = h(U).replace("(?:-->|$)", "-->").getRegex(), Fe = h("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", je).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(), q = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`[^`]*`|[^\[\]\\`])*?/, Qe = h(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label", q).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(), he = h(/^!?\[(label)\]\[(ref)\]/).replace("label", q).replace("ref", Q).getRegex(), de = h(/^!?\[(ref)\](?:\[\])?/).replace("ref", Q).getRegex(), Ue = h("reflink|nolink(?!\\()", "g").replace("reflink", he).replace("nolink", de).getRegex(), X = { _backpedal: E, anyPunctuation: Ge, autolink: Ne, blockSkip: Be, br: ae, code: ze, del: E, emStrongLDelim: qe, emStrongRDelimAst: De, emStrongRDelimUnd: Ze, escape: Me, link: Qe, nolink: de, punctuation: Ee, reflink: he, reflinkSearch: Ue, tag: Fe, text: Ae, url: E }, Ke = { ...X, link: h(/^!?\[(label)\]\((.*?)\)/).replace("label", q).getRegex(), reflink: h(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", q).getRegex() }, N = { ...X, emStrongRDelimAst: He, emStrongLDelim: ve, url: h(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/, "i").replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/, text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/ }, We = { ...N, br: h(ae).replace("{2,}", "*").getRegex(), text: h(N.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() }, I = { normal: K, gfm: _e, pedantic: Le }, M = { normal: X, gfm: N, breaks: We, pedantic: Ke };
  var Xe = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }, ke = (l) => Xe[l];
  function w(l, e) {
    if (e) {
      if (m.escapeTest.test(l))
        return l.replace(m.escapeReplace, ke);
    } else if (m.escapeTestNoEncode.test(l))
      return l.replace(m.escapeReplaceNoEncode, ke);
    return l;
  }
  function J(l) {
    try {
      l = encodeURI(l).replace(m.percentDecode, "%");
    } catch {
      return null;
    }
    return l;
  }
  function V(l, e) {
    var _a2;
    let t = l.replace(m.findPipe, (i, s, o) => {
      let a = false, u = s;
      for (; --u >= 0 && o[u] === "\\"; )
        a = !a;
      return a ? "|" : " |";
    }), n = t.split(m.splitPipe), r = 0;
    if (n[0].trim() || n.shift(), n.length > 0 && !((_a2 = n.at(-1)) == null ? void 0 : _a2.trim()) && n.pop(), e)
      if (n.length > e)
        n.splice(e);
      else
        for (; n.length < e; )
          n.push("");
    for (; r < n.length; r++)
      n[r] = n[r].trim().replace(m.slashPipe, "|");
    return n;
  }
  function z(l, e, t) {
    let n = l.length;
    if (n === 0)
      return "";
    let r = 0;
    for (; r < n; ) {
      let i = l.charAt(n - r - 1);
      if (i === e && !t)
        r++;
      else if (i !== e && t)
        r++;
      else
        break;
    }
    return l.slice(0, n - r);
  }
  function ge(l, e) {
    if (l.indexOf(e[1]) === -1)
      return -1;
    let t = 0;
    for (let n = 0; n < l.length; n++)
      if (l[n] === "\\")
        n++;
      else if (l[n] === e[0])
        t++;
      else if (l[n] === e[1] && (t--, t < 0))
        return n;
    return t > 0 ? -2 : -1;
  }
  function fe(l, e, t, n, r) {
    let i = e.href, s = e.title || null, o = l[1].replace(r.other.outputLinkReplace, "$1");
    n.state.inLink = true;
    let a = { type: l[0].charAt(0) === "!" ? "image" : "link", raw: t, href: i, title: s, text: o, tokens: n.inlineTokens(o) };
    return n.state.inLink = false, a;
  }
  function Je(l, e, t) {
    let n = l.match(t.other.indentCodeCompensation);
    if (n === null)
      return e;
    let r = n[1];
    return e.split(`
`).map((i) => {
      let s = i.match(t.other.beginningSpace);
      if (s === null)
        return i;
      let [o] = s;
      return o.length >= r.length ? i.slice(r.length) : i;
    }).join(`
`);
  }
  var y = class {
    constructor(e) {
      __publicField(this, "options");
      __publicField(this, "rules");
      __publicField(this, "lexer");
      this.options = e || O;
    }
    space(e) {
      let t = this.rules.block.newline.exec(e);
      if (t && t[0].length > 0)
        return { type: "space", raw: t[0] };
    }
    code(e) {
      let t = this.rules.block.code.exec(e);
      if (t) {
        let n = t[0].replace(this.rules.other.codeRemoveIndent, "");
        return { type: "code", raw: t[0], codeBlockStyle: "indented", text: this.options.pedantic ? n : z(n, `
`) };
      }
    }
    fences(e) {
      let t = this.rules.block.fences.exec(e);
      if (t) {
        let n = t[0], r = Je(n, t[3] || "", this.rules);
        return { type: "code", raw: n, lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2], text: r };
      }
    }
    heading(e) {
      let t = this.rules.block.heading.exec(e);
      if (t) {
        let n = t[2].trim();
        if (this.rules.other.endingHash.test(n)) {
          let r = z(n, "#");
          (this.options.pedantic || !r || this.rules.other.endingSpaceChar.test(r)) && (n = r.trim());
        }
        return { type: "heading", raw: t[0], depth: t[1].length, text: n, tokens: this.lexer.inline(n) };
      }
    }
    hr(e) {
      let t = this.rules.block.hr.exec(e);
      if (t)
        return { type: "hr", raw: z(t[0], `
`) };
    }
    blockquote(e) {
      let t = this.rules.block.blockquote.exec(e);
      if (t) {
        let n = z(t[0], `
`).split(`
`), r = "", i = "", s = [];
        for (; n.length > 0; ) {
          let o = false, a = [], u;
          for (u = 0; u < n.length; u++)
            if (this.rules.other.blockquoteStart.test(n[u]))
              a.push(n[u]), o = true;
            else if (!o)
              a.push(n[u]);
            else
              break;
          n = n.slice(u);
          let p = a.join(`
`), c = p.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
          r = r ? `${r}
${p}` : p, i = i ? `${i}
${c}` : c;
          let f = this.lexer.state.top;
          if (this.lexer.state.top = true, this.lexer.blockTokens(c, s, true), this.lexer.state.top = f, n.length === 0)
            break;
          let k = s.at(-1);
          if ((k == null ? void 0 : k.type) === "code")
            break;
          if ((k == null ? void 0 : k.type) === "blockquote") {
            let x = k, g = x.raw + `
` + n.join(`
`), T = this.blockquote(g);
            s[s.length - 1] = T, r = r.substring(0, r.length - x.raw.length) + T.raw, i = i.substring(0, i.length - x.text.length) + T.text;
            break;
          } else if ((k == null ? void 0 : k.type) === "list") {
            let x = k, g = x.raw + `
` + n.join(`
`), T = this.list(g);
            s[s.length - 1] = T, r = r.substring(0, r.length - k.raw.length) + T.raw, i = i.substring(0, i.length - x.raw.length) + T.raw, n = g.substring(s.at(-1).raw.length).split(`
`);
            continue;
          }
        }
        return { type: "blockquote", raw: r, tokens: s, text: i };
      }
    }
    list(e) {
      let t = this.rules.block.list.exec(e);
      if (t) {
        let n = t[1].trim(), r = n.length > 1, i = { type: "list", raw: "", ordered: r, start: r ? +n.slice(0, -1) : "", loose: false, items: [] };
        n = r ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = r ? n : "[*+-]");
        let s = this.rules.other.listItemRegex(n), o = false;
        for (; e; ) {
          let u = false, p = "", c = "";
          if (!(t = s.exec(e)) || this.rules.block.hr.test(e))
            break;
          p = t[0], e = e.substring(p.length);
          let f = t[2].split(`
`, 1)[0].replace(this.rules.other.listReplaceTabs, (H) => " ".repeat(3 * H.length)), k = e.split(`
`, 1)[0], x = !f.trim(), g = 0;
          if (this.options.pedantic ? (g = 2, c = f.trimStart()) : x ? g = t[1].length + 1 : (g = t[2].search(this.rules.other.nonSpaceChar), g = g > 4 ? 1 : g, c = f.slice(g), g += t[1].length), x && this.rules.other.blankLine.test(k) && (p += k + `
`, e = e.substring(k.length + 1), u = true), !u) {
            let H = this.rules.other.nextBulletRegex(g), ee = this.rules.other.hrRegex(g), te = this.rules.other.fencesBeginRegex(g), ne = this.rules.other.headingBeginRegex(g), me = this.rules.other.htmlBeginRegex(g);
            for (; e; ) {
              let Z = e.split(`
`, 1)[0], A;
              if (k = Z, this.options.pedantic ? (k = k.replace(this.rules.other.listReplaceNesting, "  "), A = k) : A = k.replace(this.rules.other.tabCharGlobal, "    "), te.test(k) || ne.test(k) || me.test(k) || H.test(k) || ee.test(k))
                break;
              if (A.search(this.rules.other.nonSpaceChar) >= g || !k.trim())
                c += `
` + A.slice(g);
              else {
                if (x || f.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || te.test(f) || ne.test(f) || ee.test(f))
                  break;
                c += `
` + k;
              }
              !x && !k.trim() && (x = true), p += Z + `
`, e = e.substring(Z.length + 1), f = A.slice(g);
            }
          }
          i.loose || (o ? i.loose = true : this.rules.other.doubleBlankLine.test(p) && (o = true));
          let T = null, Y;
          this.options.gfm && (T = this.rules.other.listIsTask.exec(c), T && (Y = T[0] !== "[ ] ", c = c.replace(this.rules.other.listReplaceTask, ""))), i.items.push({ type: "list_item", raw: p, task: !!T, checked: Y, loose: false, text: c, tokens: [] }), i.raw += p;
        }
        let a = i.items.at(-1);
        if (a)
          a.raw = a.raw.trimEnd(), a.text = a.text.trimEnd();
        else
          return;
        i.raw = i.raw.trimEnd();
        for (let u = 0; u < i.items.length; u++)
          if (this.lexer.state.top = false, i.items[u].tokens = this.lexer.blockTokens(i.items[u].text, []), !i.loose) {
            let p = i.items[u].tokens.filter((f) => f.type === "space"), c = p.length > 0 && p.some((f) => this.rules.other.anyLine.test(f.raw));
            i.loose = c;
          }
        if (i.loose)
          for (let u = 0; u < i.items.length; u++)
            i.items[u].loose = true;
        return i;
      }
    }
    html(e) {
      let t = this.rules.block.html.exec(e);
      if (t)
        return { type: "html", block: true, raw: t[0], pre: t[1] === "pre" || t[1] === "script" || t[1] === "style", text: t[0] };
    }
    def(e) {
      let t = this.rules.block.def.exec(e);
      if (t) {
        let n = t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), r = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", i = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
        return { type: "def", tag: n, raw: t[0], href: r, title: i };
      }
    }
    table(e) {
      var _a2;
      let t = this.rules.block.table.exec(e);
      if (!t || !this.rules.other.tableDelimiter.test(t[2]))
        return;
      let n = V(t[1]), r = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), i = ((_a2 = t[3]) == null ? void 0 : _a2.trim()) ? t[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], s = { type: "table", raw: t[0], header: [], align: [], rows: [] };
      if (n.length === r.length) {
        for (let o of r)
          this.rules.other.tableAlignRight.test(o) ? s.align.push("right") : this.rules.other.tableAlignCenter.test(o) ? s.align.push("center") : this.rules.other.tableAlignLeft.test(o) ? s.align.push("left") : s.align.push(null);
        for (let o = 0; o < n.length; o++)
          s.header.push({ text: n[o], tokens: this.lexer.inline(n[o]), header: true, align: s.align[o] });
        for (let o of i)
          s.rows.push(V(o, s.header.length).map((a, u) => ({ text: a, tokens: this.lexer.inline(a), header: false, align: s.align[u] })));
        return s;
      }
    }
    lheading(e) {
      let t = this.rules.block.lheading.exec(e);
      if (t)
        return { type: "heading", raw: t[0], depth: t[2].charAt(0) === "=" ? 1 : 2, text: t[1], tokens: this.lexer.inline(t[1]) };
    }
    paragraph(e) {
      let t = this.rules.block.paragraph.exec(e);
      if (t) {
        let n = t[1].charAt(t[1].length - 1) === `
` ? t[1].slice(0, -1) : t[1];
        return { type: "paragraph", raw: t[0], text: n, tokens: this.lexer.inline(n) };
      }
    }
    text(e) {
      let t = this.rules.block.text.exec(e);
      if (t)
        return { type: "text", raw: t[0], text: t[0], tokens: this.lexer.inline(t[0]) };
    }
    escape(e) {
      let t = this.rules.inline.escape.exec(e);
      if (t)
        return { type: "escape", raw: t[0], text: t[1] };
    }
    tag(e) {
      let t = this.rules.inline.tag.exec(e);
      if (t)
        return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = true : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = false), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = true : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = false), { type: "html", raw: t[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: false, text: t[0] };
    }
    link(e) {
      let t = this.rules.inline.link.exec(e);
      if (t) {
        let n = t[2].trim();
        if (!this.options.pedantic && this.rules.other.startAngleBracket.test(n)) {
          if (!this.rules.other.endAngleBracket.test(n))
            return;
          let s = z(n.slice(0, -1), "\\");
          if ((n.length - s.length) % 2 === 0)
            return;
        } else {
          let s = ge(t[2], "()");
          if (s === -2)
            return;
          if (s > -1) {
            let a = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + s;
            t[2] = t[2].substring(0, s), t[0] = t[0].substring(0, a).trim(), t[3] = "";
          }
        }
        let r = t[2], i = "";
        if (this.options.pedantic) {
          let s = this.rules.other.pedanticHrefTitle.exec(r);
          s && (r = s[1], i = s[3]);
        } else
          i = t[3] ? t[3].slice(1, -1) : "";
        return r = r.trim(), this.rules.other.startAngleBracket.test(r) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(n) ? r = r.slice(1) : r = r.slice(1, -1)), fe(t, { href: r && r.replace(this.rules.inline.anyPunctuation, "$1"), title: i && i.replace(this.rules.inline.anyPunctuation, "$1") }, t[0], this.lexer, this.rules);
      }
    }
    reflink(e, t) {
      let n;
      if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
        let r = (n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " "), i = t[r.toLowerCase()];
        if (!i) {
          let s = n[0].charAt(0);
          return { type: "text", raw: s, text: s };
        }
        return fe(n, i, n[0], this.lexer, this.rules);
      }
    }
    emStrong(e, t, n = "") {
      let r = this.rules.inline.emStrongLDelim.exec(e);
      if (!r || r[3] && n.match(this.rules.other.unicodeAlphaNumeric))
        return;
      if (!(r[1] || r[2] || "") || !n || this.rules.inline.punctuation.exec(n)) {
        let s = [...r[0]].length - 1, o, a, u = s, p = 0, c = r[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
        for (c.lastIndex = 0, t = t.slice(-1 * e.length + s); (r = c.exec(t)) != null; ) {
          if (o = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !o)
            continue;
          if (a = [...o].length, r[3] || r[4]) {
            u += a;
            continue;
          } else if ((r[5] || r[6]) && s % 3 && !((s + a) % 3)) {
            p += a;
            continue;
          }
          if (u -= a, u > 0)
            continue;
          a = Math.min(a, a + u + p);
          let f = [...r[0]][0].length, k = e.slice(0, s + r.index + f + a);
          if (Math.min(s, a) % 2) {
            let g = k.slice(1, -1);
            return { type: "em", raw: k, text: g, tokens: this.lexer.inlineTokens(g) };
          }
          let x = k.slice(2, -2);
          return { type: "strong", raw: k, text: x, tokens: this.lexer.inlineTokens(x) };
        }
      }
    }
    codespan(e) {
      let t = this.rules.inline.code.exec(e);
      if (t) {
        let n = t[2].replace(this.rules.other.newLineCharGlobal, " "), r = this.rules.other.nonSpaceChar.test(n), i = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
        return r && i && (n = n.substring(1, n.length - 1)), { type: "codespan", raw: t[0], text: n };
      }
    }
    br(e) {
      let t = this.rules.inline.br.exec(e);
      if (t)
        return { type: "br", raw: t[0] };
    }
    del(e) {
      let t = this.rules.inline.del.exec(e);
      if (t)
        return { type: "del", raw: t[0], text: t[2], tokens: this.lexer.inlineTokens(t[2]) };
    }
    autolink(e) {
      let t = this.rules.inline.autolink.exec(e);
      if (t) {
        let n, r;
        return t[2] === "@" ? (n = t[1], r = "mailto:" + n) : (n = t[1], r = n), { type: "link", raw: t[0], text: n, href: r, tokens: [{ type: "text", raw: n, text: n }] };
      }
    }
    url(e) {
      var _a2;
      let t;
      if (t = this.rules.inline.url.exec(e)) {
        let n, r;
        if (t[2] === "@")
          n = t[0], r = "mailto:" + n;
        else {
          let i;
          do
            i = t[0], t[0] = ((_a2 = this.rules.inline._backpedal.exec(t[0])) == null ? void 0 : _a2[0]) ?? "";
          while (i !== t[0]);
          n = t[0], t[1] === "www." ? r = "http://" + t[0] : r = t[0];
        }
        return { type: "link", raw: t[0], text: n, href: r, tokens: [{ type: "text", raw: n, text: n }] };
      }
    }
    inlineText(e) {
      let t = this.rules.inline.text.exec(e);
      if (t) {
        let n = this.lexer.state.inRawBlock;
        return { type: "text", raw: t[0], text: t[0], escaped: n };
      }
    }
  };
  var b = class l {
    constructor(e) {
      __publicField(this, "tokens");
      __publicField(this, "options");
      __publicField(this, "state");
      __publicField(this, "tokenizer");
      __publicField(this, "inlineQueue");
      this.tokens = [], this.tokens.links = /* @__PURE__ */ Object.create(null), this.options = e || O, this.options.tokenizer = this.options.tokenizer || new y(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: false, inRawBlock: false, top: true };
      let t = { other: m, block: I.normal, inline: M.normal };
      this.options.pedantic ? (t.block = I.pedantic, t.inline = M.pedantic) : this.options.gfm && (t.block = I.gfm, this.options.breaks ? t.inline = M.breaks : t.inline = M.gfm), this.tokenizer.rules = t;
    }
    static get rules() {
      return { block: I, inline: M };
    }
    static lex(e, t) {
      return new l(t).lex(e);
    }
    static lexInline(e, t) {
      return new l(t).inlineTokens(e);
    }
    lex(e) {
      e = e.replace(m.carriageReturn, `
`), this.blockTokens(e, this.tokens);
      for (let t = 0; t < this.inlineQueue.length; t++) {
        let n = this.inlineQueue[t];
        this.inlineTokens(n.src, n.tokens);
      }
      return this.inlineQueue = [], this.tokens;
    }
    blockTokens(e, t = [], n = false) {
      var _a2, _b, _c;
      for (this.options.pedantic && (e = e.replace(m.tabCharGlobal, "    ").replace(m.spaceLine, "")); e; ) {
        let r;
        if ((_b = (_a2 = this.options.extensions) == null ? void 0 : _a2.block) == null ? void 0 : _b.some((s) => (r = s.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), true) : false))
          continue;
        if (r = this.tokenizer.space(e)) {
          e = e.substring(r.raw.length);
          let s = t.at(-1);
          r.raw.length === 1 && s !== void 0 ? s.raw += `
` : t.push(r);
          continue;
        }
        if (r = this.tokenizer.code(e)) {
          e = e.substring(r.raw.length);
          let s = t.at(-1);
          (s == null ? void 0 : s.type) === "paragraph" || (s == null ? void 0 : s.type) === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.at(-1).src = s.text) : t.push(r);
          continue;
        }
        if (r = this.tokenizer.fences(e)) {
          e = e.substring(r.raw.length), t.push(r);
          continue;
        }
        if (r = this.tokenizer.heading(e)) {
          e = e.substring(r.raw.length), t.push(r);
          continue;
        }
        if (r = this.tokenizer.hr(e)) {
          e = e.substring(r.raw.length), t.push(r);
          continue;
        }
        if (r = this.tokenizer.blockquote(e)) {
          e = e.substring(r.raw.length), t.push(r);
          continue;
        }
        if (r = this.tokenizer.list(e)) {
          e = e.substring(r.raw.length), t.push(r);
          continue;
        }
        if (r = this.tokenizer.html(e)) {
          e = e.substring(r.raw.length), t.push(r);
          continue;
        }
        if (r = this.tokenizer.def(e)) {
          e = e.substring(r.raw.length);
          let s = t.at(-1);
          (s == null ? void 0 : s.type) === "paragraph" || (s == null ? void 0 : s.type) === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.raw, this.inlineQueue.at(-1).src = s.text) : this.tokens.links[r.tag] || (this.tokens.links[r.tag] = { href: r.href, title: r.title }, t.push(r));
          continue;
        }
        if (r = this.tokenizer.table(e)) {
          e = e.substring(r.raw.length), t.push(r);
          continue;
        }
        if (r = this.tokenizer.lheading(e)) {
          e = e.substring(r.raw.length), t.push(r);
          continue;
        }
        let i = e;
        if ((_c = this.options.extensions) == null ? void 0 : _c.startBlock) {
          let s = 1 / 0, o = e.slice(1), a;
          this.options.extensions.startBlock.forEach((u) => {
            a = u.call({ lexer: this }, o), typeof a == "number" && a >= 0 && (s = Math.min(s, a));
          }), s < 1 / 0 && s >= 0 && (i = e.substring(0, s + 1));
        }
        if (this.state.top && (r = this.tokenizer.paragraph(i))) {
          let s = t.at(-1);
          n && (s == null ? void 0 : s.type) === "paragraph" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r), n = i.length !== e.length, e = e.substring(r.raw.length);
          continue;
        }
        if (r = this.tokenizer.text(e)) {
          e = e.substring(r.raw.length);
          let s = t.at(-1);
          (s == null ? void 0 : s.type) === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r);
          continue;
        }
        if (e) {
          let s = "Infinite loop on byte: " + e.charCodeAt(0);
          if (this.options.silent) {
            formatAppLog("error", "at uni_modules/mp-html/plugins/markdown/marked.min.js:51", s);
            break;
          } else
            throw new Error(s);
        }
      }
      return this.state.top = true, t;
    }
    inline(e, t = []) {
      return this.inlineQueue.push({ src: e, tokens: t }), t;
    }
    inlineTokens(e, t = []) {
      var _a2, _b, _c, _d, _e2;
      let n = e, r = null;
      if (this.tokens.links) {
        let o = Object.keys(this.tokens.links);
        if (o.length > 0)
          for (; (r = this.tokenizer.rules.inline.reflinkSearch.exec(n)) != null; )
            o.includes(r[0].slice(r[0].lastIndexOf("[") + 1, -1)) && (n = n.slice(0, r.index) + "[" + "a".repeat(r[0].length - 2) + "]" + n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
      }
      for (; (r = this.tokenizer.rules.inline.anyPunctuation.exec(n)) != null; )
        n = n.slice(0, r.index) + "++" + n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
      for (; (r = this.tokenizer.rules.inline.blockSkip.exec(n)) != null; )
        n = n.slice(0, r.index) + "[" + "a".repeat(r[0].length - 2) + "]" + n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
      n = ((_b = (_a2 = this.options.hooks) == null ? void 0 : _a2.emStrongMask) == null ? void 0 : _b.call({ lexer: this }, n)) ?? n;
      let i = false, s = "";
      for (; e; ) {
        i || (s = ""), i = false;
        let o;
        if ((_d = (_c = this.options.extensions) == null ? void 0 : _c.inline) == null ? void 0 : _d.some((u) => (o = u.call({ lexer: this }, e, t)) ? (e = e.substring(o.raw.length), t.push(o), true) : false))
          continue;
        if (o = this.tokenizer.escape(e)) {
          e = e.substring(o.raw.length), t.push(o);
          continue;
        }
        if (o = this.tokenizer.tag(e)) {
          e = e.substring(o.raw.length), t.push(o);
          continue;
        }
        if (o = this.tokenizer.link(e)) {
          e = e.substring(o.raw.length), t.push(o);
          continue;
        }
        if (o = this.tokenizer.reflink(e, this.tokens.links)) {
          e = e.substring(o.raw.length);
          let u = t.at(-1);
          o.type === "text" && (u == null ? void 0 : u.type) === "text" ? (u.raw += o.raw, u.text += o.text) : t.push(o);
          continue;
        }
        if (o = this.tokenizer.emStrong(e, n, s)) {
          e = e.substring(o.raw.length), t.push(o);
          continue;
        }
        if (o = this.tokenizer.codespan(e)) {
          e = e.substring(o.raw.length), t.push(o);
          continue;
        }
        if (o = this.tokenizer.br(e)) {
          e = e.substring(o.raw.length), t.push(o);
          continue;
        }
        if (o = this.tokenizer.del(e)) {
          e = e.substring(o.raw.length), t.push(o);
          continue;
        }
        if (o = this.tokenizer.autolink(e)) {
          e = e.substring(o.raw.length), t.push(o);
          continue;
        }
        if (!this.state.inLink && (o = this.tokenizer.url(e))) {
          e = e.substring(o.raw.length), t.push(o);
          continue;
        }
        let a = e;
        if ((_e2 = this.options.extensions) == null ? void 0 : _e2.startInline) {
          let u = 1 / 0, p = e.slice(1), c;
          this.options.extensions.startInline.forEach((f) => {
            c = f.call({ lexer: this }, p), typeof c == "number" && c >= 0 && (u = Math.min(u, c));
          }), u < 1 / 0 && u >= 0 && (a = e.substring(0, u + 1));
        }
        if (o = this.tokenizer.inlineText(a)) {
          e = e.substring(o.raw.length), o.raw.slice(-1) !== "_" && (s = o.raw.slice(-1)), i = true;
          let u = t.at(-1);
          (u == null ? void 0 : u.type) === "text" ? (u.raw += o.raw, u.text += o.text) : t.push(o);
          continue;
        }
        if (e) {
          let u = "Infinite loop on byte: " + e.charCodeAt(0);
          if (this.options.silent) {
            formatAppLog("error", "at uni_modules/mp-html/plugins/markdown/marked.min.js:51", u);
            break;
          } else
            throw new Error(u);
        }
      }
      return t;
    }
  };
  var P = class {
    constructor(e) {
      __publicField(this, "options");
      __publicField(this, "parser");
      this.options = e || O;
    }
    space(e) {
      return "";
    }
    code({ text: e, lang: t, escaped: n }) {
      var _a2;
      let r = (_a2 = (t || "").match(m.notSpaceStart)) == null ? void 0 : _a2[0], i = e.replace(m.endingNewline, "") + `
`;
      return r ? '<pre><code class="language-' + w(r) + '">' + (n ? i : w(i, true)) + `</code></pre>
` : "<pre><code>" + (n ? i : w(i, true)) + `</code></pre>
`;
    }
    blockquote({ tokens: e }) {
      return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
    }
    html({ text: e }) {
      return e;
    }
    def(e) {
      return "";
    }
    heading({ tokens: e, depth: t }) {
      return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
    }
    hr(e) {
      return `<hr>
`;
    }
    list(e) {
      let t = e.ordered, n = e.start, r = "";
      for (let o = 0; o < e.items.length; o++) {
        let a = e.items[o];
        r += this.listitem(a);
      }
      let i = t ? "ol" : "ul", s = t && n !== 1 ? ' start="' + n + '"' : "";
      return "<" + i + s + `>
` + r + "</" + i + `>
`;
    }
    listitem(e) {
      var _a2;
      let t = "";
      if (e.task) {
        let n = this.checkbox({ checked: !!e.checked });
        e.loose ? ((_a2 = e.tokens[0]) == null ? void 0 : _a2.type) === "paragraph" ? (e.tokens[0].text = n + " " + e.tokens[0].text, e.tokens[0].tokens && e.tokens[0].tokens.length > 0 && e.tokens[0].tokens[0].type === "text" && (e.tokens[0].tokens[0].text = n + " " + w(e.tokens[0].tokens[0].text), e.tokens[0].tokens[0].escaped = true)) : e.tokens.unshift({ type: "text", raw: n + " ", text: n + " ", escaped: true }) : t += n + " ";
      }
      return t += this.parser.parse(e.tokens, !!e.loose), `<li>${t}</li>
`;
    }
    checkbox({ checked: e }) {
      return "<input " + (e ? 'checked="" ' : "") + 'disabled="" type="checkbox">';
    }
    paragraph({ tokens: e }) {
      return `<p>${this.parser.parseInline(e)}</p>
`;
    }
    table(e) {
      let t = "", n = "";
      for (let i = 0; i < e.header.length; i++)
        n += this.tablecell(e.header[i]);
      t += this.tablerow({ text: n });
      let r = "";
      for (let i = 0; i < e.rows.length; i++) {
        let s = e.rows[i];
        n = "";
        for (let o = 0; o < s.length; o++)
          n += this.tablecell(s[o]);
        r += this.tablerow({ text: n });
      }
      return r && (r = `<tbody>${r}</tbody>`), `<table>
<thead>
` + t + `</thead>
` + r + `</table>
`;
    }
    tablerow({ text: e }) {
      return `<tr>
${e}</tr>
`;
    }
    tablecell(e) {
      let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
      return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
    }
    strong({ tokens: e }) {
      return `<strong>${this.parser.parseInline(e)}</strong>`;
    }
    em({ tokens: e }) {
      return `<em>${this.parser.parseInline(e)}</em>`;
    }
    codespan({ text: e }) {
      return `<code>${w(e, true)}</code>`;
    }
    br(e) {
      return "<br>";
    }
    del({ tokens: e }) {
      return `<del>${this.parser.parseInline(e)}</del>`;
    }
    link({ href: e, title: t, tokens: n }) {
      let r = this.parser.parseInline(n), i = J(e);
      if (i === null)
        return r;
      e = i;
      let s = '<a href="' + e + '"';
      return t && (s += ' title="' + w(t) + '"'), s += ">" + r + "</a>", s;
    }
    image({ href: e, title: t, text: n, tokens: r }) {
      r && (n = this.parser.parseInline(r, this.parser.textRenderer));
      let i = J(e);
      if (i === null)
        return w(n);
      e = i;
      let s = `<img src="${e}" alt="${n}"`;
      return t && (s += ` title="${w(t)}"`), s += ">", s;
    }
    text(e) {
      return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : "escaped" in e && e.escaped ? e.text : w(e.text);
    }
  };
  var $ = class {
    strong({ text: e }) {
      return e;
    }
    em({ text: e }) {
      return e;
    }
    codespan({ text: e }) {
      return e;
    }
    del({ text: e }) {
      return e;
    }
    html({ text: e }) {
      return e;
    }
    text({ text: e }) {
      return e;
    }
    link({ text: e }) {
      return "" + e;
    }
    image({ text: e }) {
      return "" + e;
    }
    br() {
      return "";
    }
  };
  var R = class l {
    constructor(e) {
      __publicField(this, "options");
      __publicField(this, "renderer");
      __publicField(this, "textRenderer");
      this.options = e || O, this.options.renderer = this.options.renderer || new P(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new $();
    }
    static parse(e, t) {
      return new l(t).parse(e);
    }
    static parseInline(e, t) {
      return new l(t).parseInline(e);
    }
    parse(e, t = true) {
      var _a2, _b;
      let n = "";
      for (let r = 0; r < e.length; r++) {
        let i = e[r];
        if ((_b = (_a2 = this.options.extensions) == null ? void 0 : _a2.renderers) == null ? void 0 : _b[i.type]) {
          let o = i, a = this.options.extensions.renderers[o.type].call({ parser: this }, o);
          if (a !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "def", "paragraph", "text"].includes(o.type)) {
            n += a || "";
            continue;
          }
        }
        let s = i;
        switch (s.type) {
          case "space": {
            n += this.renderer.space(s);
            continue;
          }
          case "hr": {
            n += this.renderer.hr(s);
            continue;
          }
          case "heading": {
            n += this.renderer.heading(s);
            continue;
          }
          case "code": {
            n += this.renderer.code(s);
            continue;
          }
          case "table": {
            n += this.renderer.table(s);
            continue;
          }
          case "blockquote": {
            n += this.renderer.blockquote(s);
            continue;
          }
          case "list": {
            n += this.renderer.list(s);
            continue;
          }
          case "html": {
            n += this.renderer.html(s);
            continue;
          }
          case "def": {
            n += this.renderer.def(s);
            continue;
          }
          case "paragraph": {
            n += this.renderer.paragraph(s);
            continue;
          }
          case "text": {
            let o = s, a = this.renderer.text(o);
            for (; r + 1 < e.length && e[r + 1].type === "text"; )
              o = e[++r], a += `
` + this.renderer.text(o);
            t ? n += this.renderer.paragraph({ type: "paragraph", raw: a, text: a, tokens: [{ type: "text", raw: a, text: a, escaped: true }] }) : n += a;
            continue;
          }
          default: {
            let o = 'Token with "' + s.type + '" type was not found.';
            if (this.options.silent)
              return formatAppLog("error", "at uni_modules/mp-html/plugins/markdown/marked.min.js:70", o), "";
            throw new Error(o);
          }
        }
      }
      return n;
    }
    parseInline(e, t = this.renderer) {
      var _a2, _b;
      let n = "";
      for (let r = 0; r < e.length; r++) {
        let i = e[r];
        if ((_b = (_a2 = this.options.extensions) == null ? void 0 : _a2.renderers) == null ? void 0 : _b[i.type]) {
          let o = this.options.extensions.renderers[i.type].call({ parser: this }, i);
          if (o !== false || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(i.type)) {
            n += o || "";
            continue;
          }
        }
        let s = i;
        switch (s.type) {
          case "escape": {
            n += t.text(s);
            break;
          }
          case "html": {
            n += t.html(s);
            break;
          }
          case "link": {
            n += t.link(s);
            break;
          }
          case "image": {
            n += t.image(s);
            break;
          }
          case "strong": {
            n += t.strong(s);
            break;
          }
          case "em": {
            n += t.em(s);
            break;
          }
          case "codespan": {
            n += t.codespan(s);
            break;
          }
          case "br": {
            n += t.br(s);
            break;
          }
          case "del": {
            n += t.del(s);
            break;
          }
          case "text": {
            n += t.text(s);
            break;
          }
          default: {
            let o = 'Token with "' + s.type + '" type was not found.';
            if (this.options.silent)
              return formatAppLog("error", "at uni_modules/mp-html/plugins/markdown/marked.min.js:70", o), "";
            throw new Error(o);
          }
        }
      }
      return n;
    }
  };
  var S = (_a = class {
    constructor(e) {
      __publicField(this, "options");
      __publicField(this, "block");
      this.options = e || O;
    }
    preprocess(e) {
      return e;
    }
    postprocess(e) {
      return e;
    }
    processAllTokens(e) {
      return e;
    }
    emStrongMask(e) {
      return e;
    }
    provideLexer() {
      return this.block ? b.lex : b.lexInline;
    }
    provideParser() {
      return this.block ? R.parse : R.parseInline;
    }
  }, __publicField(_a, "passThroughHooks", /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens", "emStrongMask"])), __publicField(_a, "passThroughHooksRespectAsync", /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens"])), _a);
  var B = class {
    constructor(...e) {
      __publicField(this, "defaults", L());
      __publicField(this, "options", this.setOptions);
      __publicField(this, "parse", this.parseMarkdown(true));
      __publicField(this, "parseInline", this.parseMarkdown(false));
      __publicField(this, "Parser", R);
      __publicField(this, "Renderer", P);
      __publicField(this, "TextRenderer", $);
      __publicField(this, "Lexer", b);
      __publicField(this, "Tokenizer", y);
      __publicField(this, "Hooks", S);
      this.use(...e);
    }
    walkTokens(e, t) {
      var _a2, _b;
      let n = [];
      for (let r of e)
        switch (n = n.concat(t.call(this, r)), r.type) {
          case "table": {
            let i = r;
            for (let s of i.header)
              n = n.concat(this.walkTokens(s.tokens, t));
            for (let s of i.rows)
              for (let o of s)
                n = n.concat(this.walkTokens(o.tokens, t));
            break;
          }
          case "list": {
            let i = r;
            n = n.concat(this.walkTokens(i.items, t));
            break;
          }
          default: {
            let i = r;
            ((_b = (_a2 = this.defaults.extensions) == null ? void 0 : _a2.childTokens) == null ? void 0 : _b[i.type]) ? this.defaults.extensions.childTokens[i.type].forEach((s) => {
              let o = i[s].flat(1 / 0);
              n = n.concat(this.walkTokens(o, t));
            }) : i.tokens && (n = n.concat(this.walkTokens(i.tokens, t)));
          }
        }
      return n;
    }
    use(...e) {
      let t = this.defaults.extensions || { renderers: {}, childTokens: {} };
      return e.forEach((n) => {
        let r = { ...n };
        if (r.async = this.defaults.async || r.async || false, n.extensions && (n.extensions.forEach((i) => {
          if (!i.name)
            throw new Error("extension name required");
          if ("renderer" in i) {
            let s = t.renderers[i.name];
            s ? t.renderers[i.name] = function(...o) {
              let a = i.renderer.apply(this, o);
              return a === false && (a = s.apply(this, o)), a;
            } : t.renderers[i.name] = i.renderer;
          }
          if ("tokenizer" in i) {
            if (!i.level || i.level !== "block" && i.level !== "inline")
              throw new Error("extension level must be 'block' or 'inline'");
            let s = t[i.level];
            s ? s.unshift(i.tokenizer) : t[i.level] = [i.tokenizer], i.start && (i.level === "block" ? t.startBlock ? t.startBlock.push(i.start) : t.startBlock = [i.start] : i.level === "inline" && (t.startInline ? t.startInline.push(i.start) : t.startInline = [i.start]));
          }
          "childTokens" in i && i.childTokens && (t.childTokens[i.name] = i.childTokens);
        }), r.extensions = t), n.renderer) {
          let i = this.defaults.renderer || new P(this.defaults);
          for (let s in n.renderer) {
            if (!(s in i))
              throw new Error(`renderer '${s}' does not exist`);
            if (["options", "parser"].includes(s))
              continue;
            let o = s, a = n.renderer[o], u = i[o];
            i[o] = (...p) => {
              let c = a.apply(i, p);
              return c === false && (c = u.apply(i, p)), c || "";
            };
          }
          r.renderer = i;
        }
        if (n.tokenizer) {
          let i = this.defaults.tokenizer || new y(this.defaults);
          for (let s in n.tokenizer) {
            if (!(s in i))
              throw new Error(`tokenizer '${s}' does not exist`);
            if (["options", "rules", "lexer"].includes(s))
              continue;
            let o = s, a = n.tokenizer[o], u = i[o];
            i[o] = (...p) => {
              let c = a.apply(i, p);
              return c === false && (c = u.apply(i, p)), c;
            };
          }
          r.tokenizer = i;
        }
        if (n.hooks) {
          let i = this.defaults.hooks || new S();
          for (let s in n.hooks) {
            if (!(s in i))
              throw new Error(`hook '${s}' does not exist`);
            if (["options", "block"].includes(s))
              continue;
            let o = s, a = n.hooks[o], u = i[o];
            S.passThroughHooks.has(s) ? i[o] = (p) => {
              if (this.defaults.async && S.passThroughHooksRespectAsync.has(s))
                return Promise.resolve(a.call(i, p)).then((f) => u.call(i, f));
              let c = a.call(i, p);
              return u.call(i, c);
            } : i[o] = (...p) => {
              let c = a.apply(i, p);
              return c === false && (c = u.apply(i, p)), c;
            };
          }
          r.hooks = i;
        }
        if (n.walkTokens) {
          let i = this.defaults.walkTokens, s = n.walkTokens;
          r.walkTokens = function(o) {
            let a = [];
            return a.push(s.call(this, o)), i && (a = a.concat(i.call(this, o))), a;
          };
        }
        this.defaults = { ...this.defaults, ...r };
      }), this;
    }
    setOptions(e) {
      return this.defaults = { ...this.defaults, ...e }, this;
    }
    lexer(e, t) {
      return b.lex(e, t ?? this.defaults);
    }
    parser(e, t) {
      return R.parse(e, t ?? this.defaults);
    }
    parseMarkdown(e) {
      return (n, r) => {
        let i = { ...r }, s = { ...this.defaults, ...i }, o = this.onError(!!s.silent, !!s.async);
        if (this.defaults.async === true && i.async === false)
          return o(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
        if (typeof n > "u" || n === null)
          return o(new Error("marked(): input parameter is undefined or null"));
        if (typeof n != "string")
          return o(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(n) + ", string expected"));
        s.hooks && (s.hooks.options = s, s.hooks.block = e);
        let a = s.hooks ? s.hooks.provideLexer() : e ? b.lex : b.lexInline, u = s.hooks ? s.hooks.provideParser() : e ? R.parse : R.parseInline;
        if (s.async)
          return Promise.resolve(s.hooks ? s.hooks.preprocess(n) : n).then((p) => a(p, s)).then((p) => s.hooks ? s.hooks.processAllTokens(p) : p).then((p) => s.walkTokens ? Promise.all(this.walkTokens(p, s.walkTokens)).then(() => p) : p).then((p) => u(p, s)).then((p) => s.hooks ? s.hooks.postprocess(p) : p).catch(o);
        try {
          s.hooks && (n = s.hooks.preprocess(n));
          let p = a(n, s);
          s.hooks && (p = s.hooks.processAllTokens(p)), s.walkTokens && this.walkTokens(p, s.walkTokens);
          let c = u(p, s);
          return s.hooks && (c = s.hooks.postprocess(c)), c;
        } catch (p) {
          return o(p);
        }
      };
    }
    onError(e, t) {
      return (n) => {
        if (n.message += `
Please report this to https://github.com/markedjs/marked.`, e) {
          let r = "<p>An error occurred:</p><pre>" + w(n.message + "", true) + "</pre>";
          return t ? Promise.resolve(r) : r;
        }
        if (t)
          return Promise.reject(n);
        throw n;
      };
    }
  };
  var _ = new B();
  function d(l, e) {
    return _.parse(l, e);
  }
  d.options = d.setOptions = function(l) {
    return _.setOptions(l), d.defaults = _.defaults, G(d.defaults), d;
  };
  d.getDefaults = L;
  d.defaults = O;
  d.use = function(...l) {
    return _.use(...l), d.defaults = _.defaults, G(d.defaults), d;
  };
  d.walkTokens = function(l, e) {
    return _.walkTokens(l, e);
  };
  d.parseInline = _.parseInline;
  d.Parser = R;
  d.parser = R.parse;
  d.Renderer = P;
  d.TextRenderer = $;
  d.Lexer = b;
  d.lexer = b.lex;
  d.Tokenizer = y;
  d.Hooks = S;
  d.parse = d;
  d.options;
  d.setOptions;
  d.use;
  d.walkTokens;
  d.parseInline;
  R.parse;
  b.lex;
  let index = 0;
  function Markdown(vm) {
    this.vm = vm;
    vm._ids = {};
  }
  Markdown.prototype.onUpdate = function(content) {
    if (this.vm.properties.markdown) {
      content = content.replace(/\*\*([^*]+)\*\*([，。！？；：])/g, "**$1**&#8203;$2");
      return d(content);
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
