<template>
  <view class="media-card" :class="{ 'media-card-video': isVideo }" @click="$emit('click')">
    <view class="media-card-cover">
      <image
        v-if="item && item.cover"
        class="media-card-cover-image"
        :src="item.cover"
        mode="aspectFill"
        lazy-load
        @error="$emit('cover-error')"
      />
      <text v-else class="media-card-cover-fallback">{{ isVideo ? "视频" : "图文" }}</text>
    </view>
    <view class="media-card-body">
      <text class="media-card-title">{{ item && item.title ? item.title : "未命名内容" }}</text>
      <text v-if="isVideo && item.description" class="media-card-description muted">
        {{ item.description }}
      </text>
      <view v-if="isVideo || metaText" class="media-card-meta">
        <text v-if="isVideo">{{ durationText }}</text>
        <text v-if="isVideo">{{ sizeText }}</text>
        <text v-if="metaText">{{ metaText }}</text>
      </view>
      <view v-if="$slots.status" class="media-card-status">
        <slot name="status"></slot>
      </view>
      <view v-if="$slots.action" class="media-card-action" @click.stop>
        <slot name="action"></slot>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  emits: ["click", "cover-error"],
  props: {
    item: {
      type: Object,
      required: true
    },
    durationText: {
      type: String,
      default: ""
    },
    sizeText: {
      type: String,
      default: ""
    },
    metaText: {
      type: String,
      default: ""
    }
  },
  computed: {
    isVideo() {
      return this.item && this.item.type === "video";
    }
  }
};
</script>

<style scoped>
.media-card {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.media-card-cover {
  width: 112px;
  height: 70px;
  overflow: hidden;
  border-radius: var(--radius-soft);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-card-cover-image {
  width: 100%;
  height: 100%;
  display: block;
}

.media-card-cover-fallback {
  color: var(--color-muted);
  font-size: 14px;
}

.media-card-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 7px;
}

.media-card-title {
  width: 100%;
  color: var(--color-text);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.media-card-description {
  width: 100%;
  font-size: 14px;
  line-height: 1.45;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.media-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  color: var(--color-muted);
  font-size: 13px;
}

.media-card-meta text {
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
}

.media-card-status,
.media-card-action {
  width: 100%;
  min-width: 0;
}

@media (max-width: 359px) {
  .media-card {
    grid-template-columns: 100px minmax(0, 1fr);
    gap: 10px;
    padding: 10px;
  }

  .media-card-cover {
    width: 100px;
    height: 63px;
  }

  .media-card-title {
    font-size: 16px;
  }
}

@media (min-width: 600px) {
  .media-card {
    grid-template-columns: 148px minmax(0, 1fr);
    gap: 16px;
    padding: 16px;
  }

  .media-card-cover {
    width: 148px;
    height: 93px;
  }
}
</style>
