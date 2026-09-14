(() => {
  const triggers = Array.from(document.querySelectorAll("[data-mobile-preview]"));
  const dialog = document.querySelector("#mobile-preview-dialog");
  if (!dialog || triggers.length === 0) {
    return;
  }

  const playlist = triggers.map((trigger) => ({
    id: trigger.dataset.mobilePreviewId,
    title: trigger.dataset.mobilePreviewTitle,
    src: trigger.dataset.mobilePreviewSrc,
    cover: trigger.dataset.mobilePreviewCover || "",
    width: Number(trigger.dataset.mobilePreviewWidth || 0),
    height: Number(trigger.dataset.mobilePreviewHeight || 0),
    coverLandscape: null,
    coverLoading: false,
    trigger,
  }));
  const previewTitle = dialog.querySelector("#mobile-preview-title");
  const previewPhone = dialog.querySelector("[data-mobile-preview-phone]");
  const previewVideo = dialog.querySelector("[data-mobile-preview-video]");
  const previewError = dialog.querySelector("[data-mobile-preview-error]");
  const previewPlay = dialog.querySelector("[data-mobile-preview-play]");
  const previewCurrentTime = dialog.querySelector("[data-mobile-preview-current-time]");
  const previewProgress = dialog.querySelector("[data-mobile-preview-progress]");
  const previewDuration = dialog.querySelector("[data-mobile-preview-duration]");
  const previous = dialog.querySelector("[data-mobile-preview-prev]");
  const next = dialog.querySelector("[data-mobile-preview-next]");
  const back = dialog.querySelector("[data-mobile-preview-back]");
  const close = dialog.querySelector("[data-mobile-preview-close]");
  let activeIndex = -1;
  let opener = null;

  function applyOrientation(landscape) {
    previewPhone.classList.toggle("is-landscape", landscape);
    previewPhone.setAttribute(
      "aria-label",
      landscape ? "横屏手机播放器模拟" : "竖屏手机播放器模拟",
    );
  }

  function preloadCover(item) {
    if (!item.cover || item.coverLoading || item.coverLandscape !== null) {
      return;
    }
    item.coverLoading = true;
    const image = new Image();
    image.onload = () => {
      item.coverLoading = false;
      item.coverLandscape = image.naturalWidth > image.naturalHeight;
      if (playlist[activeIndex] === item) {
        applyOrientation(item.coverLandscape);
      }
    };
    image.onerror = () => {
      item.coverLoading = false;
    };
    image.src = item.cover;
  }

  function updateNavigation() {
    previous.disabled = activeIndex <= 0;
    next.disabled = activeIndex < 0 || activeIndex >= playlist.length - 1;
  }

  function formatTime(value) {
    const seconds = Math.max(0, Math.floor(Number(value) || 0));
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = String(seconds % 60).padStart(2, "0");
    if (minutes < 60) {
      return `${minutes}:${remainingSeconds}`;
    }
    const hours = Math.floor(minutes / 60);
    return `${hours}:${String(minutes % 60).padStart(2, "0")}:${remainingSeconds}`;
  }

  function getKnownDuration() {
    const duration = Number(previewVideo.duration);
    return Number.isFinite(duration) && duration > 0 ? duration : 0;
  }

  function syncMediaControls() {
    const duration = getKnownDuration();
    const currentTime = Math.min(Math.max(0, Number(previewVideo.currentTime) || 0), duration || 0);
    previewCurrentTime.textContent = formatTime(currentTime);
    previewDuration.textContent = duration ? formatTime(duration) : "--:--";
    previewProgress.max = String(Math.max(1, duration));
    previewProgress.value = String(currentTime);
    previewPlay.classList.toggle("is-playing", !previewVideo.paused && !previewVideo.ended);
    previewPlay.setAttribute("aria-label", previewVideo.paused || previewVideo.ended ? "播放" : "暂停");
  }

  function resetMediaControls() {
    previewCurrentTime.textContent = "0:00";
    previewDuration.textContent = "--:--";
    previewProgress.max = "1";
    previewProgress.value = "0";
    previewPlay.classList.remove("is-playing");
    previewPlay.setAttribute("aria-label", "播放");
  }

  function showPlaybackError(message) {
    previewError.textContent = message;
    previewError.hidden = false;
  }

  function togglePlayback() {
    if (!previewVideo.src) {
      return;
    }
    if (!previewVideo.paused && !previewVideo.ended) {
      previewVideo.pause();
      return;
    }
    const playRequest = previewVideo.play();
    if (playRequest && typeof playRequest.catch === "function") {
      playRequest.catch(() => {
        const item = playlist[activeIndex];
        showPlaybackError(item ? `无法播放：${item.title}` : "无法播放视频");
      });
    }
  }

  function displayItem(index) {
    activeIndex = index;
    const item = playlist[index];
    const landscape = item.coverLandscape ?? item.width > item.height;
    previewTitle.textContent = `手机播放预览：${item.title}`;
    applyOrientation(landscape);
    previewError.hidden = true;
    previewVideo.pause();
    previewVideo.removeAttribute("src");
    resetMediaControls();
    previewVideo.src = item.src;
    previewVideo.load();
    preloadCover(item);
    updateNavigation();
  }

  function openAt(index) {
    opener = playlist[index].trigger;
    displayItem(index);
    document.body.classList.add("mobile-preview-open");
    dialog.showModal();
    close.focus();
  }

  function closePreview() {
    if (dialog.open) {
      dialog.close();
    }
  }

  playlist.forEach(preloadCover);

  triggers.forEach((trigger, index) => {
    trigger.addEventListener("click", () => openAt(index));
  });
  previous.addEventListener("click", () => displayItem(activeIndex - 1));
  next.addEventListener("click", () => displayItem(activeIndex + 1));
  previewPlay.addEventListener("click", togglePlayback);
  previewProgress.addEventListener("input", () => {
    const duration = getKnownDuration();
    if (!duration) {
      return;
    }
    previewVideo.currentTime = Math.min(Number(previewProgress.value) || 0, duration);
    syncMediaControls();
  });
  back.addEventListener("click", closePreview);
  close.addEventListener("click", closePreview);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      closePreview();
    }
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closePreview();
    }
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("mobile-preview-open");
    previewVideo.pause();
    previewVideo.removeAttribute("src");
    previewVideo.load();
    resetMediaControls();
    activeIndex = -1;
    updateNavigation();
    if (opener) {
      opener.focus();
    }
    opener = null;
  });
  previewVideo.addEventListener("error", () => {
    const item = playlist[activeIndex];
    showPlaybackError(item ? `无法播放：${item.title}` : "无法播放视频");
  });
  previewVideo.addEventListener("loadedmetadata", () => {
    const item = playlist[activeIndex];
    if (item && item.coverLandscape === null) {
      item.coverLandscape = previewVideo.videoWidth > previewVideo.videoHeight;
      applyOrientation(item.coverLandscape);
    }
    syncMediaControls();
  });
  previewVideo.addEventListener("durationchange", syncMediaControls);
  previewVideo.addEventListener("timeupdate", syncMediaControls);
  previewVideo.addEventListener("play", syncMediaControls);
  previewVideo.addEventListener("pause", syncMediaControls);
  previewVideo.addEventListener("ended", syncMediaControls);
})();
