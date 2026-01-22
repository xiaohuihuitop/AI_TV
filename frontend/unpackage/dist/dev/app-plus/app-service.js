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
  const _sfc_main$5 = {
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
  function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
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
            vue.renderList($options.activeItems, (item, index) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: item.id,
                class: "item item-card",
                style: vue.normalizeStyle({ "--delay": `${index * 60}ms` }),
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
  const PagesLatestIndex = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$4], ["__scopeId", "data-v-44f675e0"], ["__file", "D:/AI/AI_TV/frontend/pages/latest/index.vue"]]);
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
  const _sfc_main$4 = {
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
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
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
            vue.renderList($options.activeItems, (item, index) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: item.id,
                class: "item item-card",
                style: vue.normalizeStyle({ "--delay": `${index * 60}ms` }),
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
  const PagesOfflineIndex = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$3], ["__scopeId", "data-v-f97a8d65"], ["__file", "D:/AI/AI_TV/frontend/pages/offline/index.vue"]]);
  function createUniStorage() {
    return {
      get: (key) => uni.getStorageSync(key),
      set: (key, value) => uni.setStorageSync(key, value),
      remove: (key) => uni.removeStorageSync(key)
    };
  }
  const indexUrlKey = "index_url";
  const _sfc_main$3 = {
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
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
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
  const PagesSettingsIndex = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__scopeId", "data-v-a11b3e9a"], ["__file", "D:/AI/AI_TV/frontend/pages/settings/index.vue"]]);
  const _sfc_main$2 = {
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
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
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
  const PagesPlayerIndex = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-eb444998"], ["__file", "D:/AI/AI_TV/frontend/pages/player/index.vue"]]);
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
    data() {
      return {
        source: "",
        title: "",
        content: "",
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
        $data.content ? (vue.openBlock(), vue.createElementBlock(
          "text",
          {
            key: 0,
            class: "content-text",
            selectable: ""
          },
          vue.toDisplayString($data.content),
          1
          /* TEXT */
        )) : (vue.openBlock(), vue.createElementBlock("view", {
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
