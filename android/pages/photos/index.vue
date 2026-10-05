<template>
  <view class="app-page album-page">
    <view v-if="!album" class="album-missing muted">
      <text>相册内容不存在或已失效</text>
    </view>
    <view v-else class="album-viewer">
      <swiper
        class="album-swiper"
        :current="currentIndex"
        :duration="240"
        @change="handleSwipe"
      >
        <swiper-item v-for="(photo, index) in album.photos" :key="index" class="album-slide">
          <image
            class="album-image"
            :src="photo.local_path || photo.url"
            mode="aspectFit"
            :lazy-load="index > 0"
            @error="markPhotoError(index)"
          />
          <view v-if="photoErrors[index]" class="album-slide-error muted">
            <text>这张照片加载失败，请检查网络后重进相册</text>
          </view>
        </swiper-item>
      </swiper>
      <view class="album-indicator">
        <text class="album-indicator-text">{{ currentIndex + 1 }} / {{ album.photos.length }}</text>
      </view>
      <view class="album-actions">
        <button class="btn btn-ghost" :disabled="!hasPrev" @click="goPrev">上一张</button>
        <button class="btn btn-ghost" @click="goBack">返回</button>
        <button class="btn btn-ghost" :disabled="!hasNext" @click="goNext">下一张</button>
      </view>
    </view>
  </view>
</template>

<script>
import { loadPhotoAlbum, updatePhotoIndex } from "../../utils/photoQueue.js";
import { applyCachedResourcePaths, canAutoCache, createAppResourceCache, createUniResourceFileApi, createUniStorage as createResourceStorage, loadResourceCacheConfig } from "../../utils/resourceCacheRuntime.js";
import { buildResourceIdentity } from "../../utils/resourceCacheService.js";

function createUniStorage() {
  return {
    get: (key) => uni.getStorageSync(key),
    set: (key, value) => uni.setStorageSync(key, value)
  };
}

export default {
  data() {
    return {
      album: null,
      currentIndex: 0,
      photoErrors: {}
    };
  },
  computed: {
    hasPrev() {
      return this.currentIndex > 0;
    },
    hasNext() {
      return Boolean(
        this.album &&
          Array.isArray(this.album.photos) &&
          this.currentIndex < this.album.photos.length - 1
      );
    }
  },
  onLoad() {
    const { album, index } = loadPhotoAlbum(createUniStorage());
    this.album = album;
    this.currentIndex = album ? Math.min(index, album.photos.length - 1) : 0;
    this.preparePhotoCache();
    if (album && album.title) {
      uni.setNavigationBarTitle({ title: album.title });
    }
  },
  methods: {
    preparePhotoCache() {
      if (!this.album || !Array.isArray(this.album.photos)) return;
      const storage = createResourceStorage();
      const config = loadResourceCacheConfig(storage);
      const service = createAppResourceCache(storage, createUniResourceFileApi(), config);
      this.album = { ...this.album, photos: applyCachedResourcePaths(this.album.photos, service) };
      this.cacheVisiblePhotos();
    },
    cacheVisiblePhotos() {
      if (!this.album || !Array.isArray(this.album.photos)) return;
      const storage = createResourceStorage();
      const config = loadResourceCacheConfig(storage);
      canAutoCache(config).then((allowed) => {
        if (!allowed) return;
        const service = createAppResourceCache(storage, createUniResourceFileApi(), config);
        this.album.photos.slice(this.currentIndex, this.currentIndex + 2).forEach((photo) => {
          service.cacheResource({ ...photo, type: "photo", id: photo.id || photo.url, cacheFileName: this.buildCacheFileName(photo) }).then((entry) => {
            const photos = this.album.photos.map((current) =>
              current.url === photo.url ? { ...current, local_path: entry.local_path } : current
            );
            this.album = { ...this.album, photos };
          }).catch(() => {});
        });
      });
    },
    buildCacheFileName(photo) {
      const identity = buildResourceIdentity({ ...photo, type: "photo", id: photo.id || photo.url }).replace(/[^a-zA-Z0-9_-]/g, "").slice(-48);
      return `_doc/ai_tv_cache_${identity || Date.now()}.jpg`;
    },
    handleSwipe(event) {
      const index = Number(event && event.detail ? event.detail.current : 0);
      if (Number.isFinite(index)) {
        this.currentIndex = index;
        this.persistCurrentIndex();
        this.cacheVisiblePhotos();
      }
    },
    goPrev() {
      if (!this.hasPrev) return;
      this.currentIndex -= 1;
      this.persistCurrentIndex();
      this.cacheVisiblePhotos();
    },
    goNext() {
      if (!this.hasNext) return;
      this.currentIndex += 1;
      this.persistCurrentIndex();
      this.cacheVisiblePhotos();
    },
    goBack() {
      uni.navigateBack();
    },
    persistCurrentIndex() {
      if (this.album) updatePhotoIndex(createUniStorage(), this.currentIndex);
    },
    markPhotoError(index) {
      this.photoErrors = { ...this.photoErrors, [index]: true };
    }
  }
};
</script>

<style scoped>
.album-page {
  padding: 0;
  max-width: 100%;
}

.album-missing {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.album-viewer {
  width: 100%;
  height: calc(100vh - 44px - env(safe-area-inset-top));
  display: flex;
  flex-direction: column;
  background: #221d18;
}

.album-swiper {
  flex: 1;
  width: 100%;
  min-height: 0;
}

.album-slide {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.album-image {
  width: 100%;
  height: 100%;
}

.album-slide-error {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 72px;
  color: #d8cfc4;
  font-size: 14px;
  text-align: center;
}

.album-indicator {
  flex: none;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #221d18;
}

.album-indicator-text {
  color: #d8cfc4;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.album-actions {
  flex: none;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
  background: #221d18;
}

.album-actions .btn {
  width: 100%;
  min-width: 0;
  min-height: 48px;
  padding-right: 8px;
  padding-left: 8px;
  border-color: rgba(216, 207, 196, 0.36);
  background: rgba(255, 255, 255, 0.08);
  color: #f4eee6;
  white-space: nowrap;
}

.album-actions .btn[disabled] {
  opacity: 0.42;
}
</style>
