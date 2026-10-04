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
            :src="photo.url"
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
    </view>
  </view>
</template>

<script>
import { loadPhotoAlbum } from "../../utils/photoQueue.js";

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
  onLoad() {
    const { album, index } = loadPhotoAlbum(createUniStorage());
    this.album = album;
    this.currentIndex = album ? Math.min(index, album.photos.length - 1) : 0;
    if (album && album.title) {
      uni.setNavigationBarTitle({ title: album.title });
    }
  },
  methods: {
    handleSwipe(event) {
      const index = Number(event && event.detail ? event.detail.current : 0);
      if (Number.isFinite(index)) {
        this.currentIndex = index;
      }
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
  padding-bottom: env(safe-area-inset-bottom);
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
</style>
