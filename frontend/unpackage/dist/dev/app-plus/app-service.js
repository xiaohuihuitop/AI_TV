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
      return value ? JSON.parse(value) : [];
    }
    function saveList(list) {
      storage.set(key, JSON.stringify(list));
    }
    async function addDownload(item) {
      const result = await downloader.download(item.url);
      const saved = await downloader.save(result.tempFilePath);
      const list = listDownloads();
      list.unshift({
        ...item,
        local_path: saved.savedFilePath,
        downloaded_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      saveList(list);
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
      download(url) {
        return new Promise((resolve, reject) => {
          uni.downloadFile({
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
  const _sfc_main$3 = {
    data() {
      return {
        loading: false,
        error: "",
        videoItems: [],
        articleItems: []
      };
    },
    onShow() {
      this.fetchIndex();
    },
    methods: {
      /**
       * AI:拉取清单并更新页面数据。
       * @returns {void} AI:无返回值。
       */
      fetchIndex() {
        const storage = createUniStorage$2();
        const adapter = createStorageAdapter(storage);
        const indexUrl = storage.get(indexUrlKey$1);
        if (!indexUrl) {
          this.error = "请在设置中填写清单地址";
          this.videoItems = [];
          this.articleItems = [];
          return;
        }
        this.loading = true;
        this.error = "";
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
          }
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
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "app-page" }, [
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("text", { class: "title" }, "最新"),
        vue.createElementVNode("text", { class: "subtitle muted" }, "从清单加载内容")
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
        vue.createElementVNode("view", { class: "column card" }, [
          vue.createElementVNode("text", { class: "column-title" }, "视频"),
          $data.videoItems.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "placeholder muted"
          }, "暂无数据")) : vue.createCommentVNode("v-if", true),
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.videoItems, (item) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: item.id,
                class: "item"
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "item-title" },
                  vue.toDisplayString(item.title),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("button", {
                  class: "download",
                  size: "mini",
                  onClick: ($event) => $options.addDownload(item)
                }, "下载", 8, ["onClick"])
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ]),
        vue.createElementVNode("view", { class: "column card" }, [
          vue.createElementVNode("text", { class: "column-title" }, "图文"),
          $data.articleItems.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "placeholder muted"
          }, "暂无数据")) : vue.createCommentVNode("v-if", true),
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.articleItems, (item) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: item.id,
                class: "item"
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "item-title" },
                  vue.toDisplayString(item.title),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("button", {
                  class: "download",
                  size: "mini",
                  onClick: ($event) => $options.addDownload(item)
                }, "下载", 8, ["onClick"])
              ]);
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
  const PagesLatestIndex = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__scopeId", "data-v-44f675e0"], ["__file", "D:/AI/AI_TV/frontend/pages/latest/index.vue"]]);
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
  const _sfc_main$2 = {
    data() {
      return {
        videoItems: [],
        articleItems: []
      };
    },
    onShow() {
      this.listDownloads();
    },
    methods: {
      /**
       * AI:加载离线下载列表并渲染。
       * @returns {void} AI:无返回值。
       */
      listDownloads() {
        const storage = createUniStorage$1();
        const service = createOfflineService(storage, createEmptyDownloader());
        const list = service.listDownloads();
        this.videoItems = list.filter((item) => item.type === "video");
        this.articleItems = list.filter((item) => item.type === "article");
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
          this.listDownloads();
          uni.showToast({ title: "已删除", icon: "success" });
        }).catch(() => {
          uni.showToast({ title: "删除失败", icon: "none" });
        });
      }
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "app-page" }, [
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("text", { class: "title" }, "离线"),
        vue.createElementVNode("text", { class: "subtitle muted" }, "本地缓存的内容")
      ]),
      vue.createElementVNode("view", { class: "columns" }, [
        vue.createElementVNode("view", { class: "column card" }, [
          vue.createElementVNode("text", { class: "column-title" }, "视频"),
          $data.videoItems.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "placeholder muted"
          }, "暂无下载")) : vue.createCommentVNode("v-if", true),
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.videoItems, (item) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: item.id,
                class: "item"
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "item-title" },
                  vue.toDisplayString(item.title),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("button", {
                  class: "remove",
                  size: "mini",
                  onClick: ($event) => $options.removeDownload(item)
                }, "删除", 8, ["onClick"])
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ]),
        vue.createElementVNode("view", { class: "column card" }, [
          vue.createElementVNode("text", { class: "column-title" }, "图文"),
          $data.articleItems.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "placeholder muted"
          }, "暂无下载")) : vue.createCommentVNode("v-if", true),
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($data.articleItems, (item) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                key: item.id,
                class: "item"
              }, [
                vue.createElementVNode(
                  "text",
                  { class: "item-title" },
                  vue.toDisplayString(item.title),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("button", {
                  class: "remove",
                  size: "mini",
                  onClick: ($event) => $options.removeDownload(item)
                }, "删除", 8, ["onClick"])
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])
      ])
    ]);
  }
  const PagesOfflineIndex = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-f97a8d65"], ["__file", "D:/AI/AI_TV/frontend/pages/offline/index.vue"]]);
  function createUniStorage() {
    return {
      get: (key) => uni.getStorageSync(key),
      set: (key, value) => uni.setStorageSync(key, value),
      remove: (key) => uni.removeStorageSync(key)
    };
  }
  const indexUrlKey = "index_url";
  const _sfc_main$1 = {
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
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "app-page" }, [
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("text", { class: "title" }, "设置"),
        vue.createElementVNode("text", { class: "subtitle muted" }, "清单地址")
      ]),
      vue.createElementVNode("view", { class: "card" }, [
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
            class: "save",
            size: "mini",
            onClick: _cache[1] || (_cache[1] = (...args) => $options.saveIndexUrl && $options.saveIndexUrl(...args))
          }, "保存"),
          vue.createElementVNode(
            "text",
            { class: "muted" },
            vue.toDisplayString($data.savedHint),
            1
            /* TEXT */
          )
        ])
      ])
    ]);
  }
  const PagesSettingsIndex = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__scopeId", "data-v-a11b3e9a"], ["__file", "D:/AI/AI_TV/frontend/pages/settings/index.vue"]]);
  __definePage("pages/latest/index", PagesLatestIndex);
  __definePage("pages/offline/index", PagesOfflineIndex);
  __definePage("pages/settings/index", PagesSettingsIndex);
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
