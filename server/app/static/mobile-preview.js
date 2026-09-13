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
    width: Number(trigger.dataset.mobilePreviewWidth || 0),
    height: Number(trigger.dataset.mobilePreviewHeight || 0),
    trigger,
  }));
  const previewTitle = dialog.querySelector("#mobile-preview-title");
  const previewPhone = dialog.querySelector("[data-mobile-preview-phone]");
  const previewVideo = dialog.querySelector("[data-mobile-preview-video]");
  const previewError = dialog.querySelector("[data-mobile-preview-error]");
  const previewOrientation = dialog.querySelector("[data-mobile-preview-orientation]");
  const previewDimensions = dialog.querySelector("[data-mobile-preview-dimensions]");
  const previewLayoutNote = dialog.querySelector("[data-mobile-preview-layout-note]");
  const previous = dialog.querySelector("[data-mobile-preview-prev]");
  const next = dialog.querySelector("[data-mobile-preview-next]");
  const back = dialog.querySelector("[data-mobile-preview-back]");
  const close = dialog.querySelector("[data-mobile-preview-close]");
  let activeIndex = -1;
  let opener = null;

  function updateNavigation() {
    previous.disabled = activeIndex <= 0;
    next.disabled = activeIndex < 0 || activeIndex >= playlist.length - 1;
  }

  function getPlaybackLayout(item) {
    const hasDimensions = item.width > 0 && item.height > 0;
    const landscape = hasDimensions && item.width > item.height;
    return {
      landscape,
      orientation: hasDimensions ? (landscape ? "横屏播放" : "竖屏播放") : "方向待识别",
      dimensions: hasDimensions ? `画面 ${item.width} × ${item.height}` : "画面尺寸待识别",
      note: hasDimensions
        ? "视频区完整显示，不裁切；底部操作栏为 76px，三个按钮独立显示，不遮挡视频。"
        : "尺寸尚未识别，手机方向待客户端读取视频或封面后确定；底部操作栏为 76px，三个按钮独立显示。",
    };
  }

  function displayItem(index) {
    activeIndex = index;
    const item = playlist[index];
    const layout = getPlaybackLayout(item);
    previewTitle.textContent = `手机播放预览：${item.title}`;
    previewPhone.classList.toggle("is-landscape", layout.landscape);
    previewOrientation.textContent = layout.orientation;
    previewDimensions.textContent = layout.dimensions;
    previewLayoutNote.textContent = layout.note;
    previewError.hidden = true;
    previewVideo.pause();
    previewVideo.removeAttribute("src");
    previewVideo.src = item.src;
    previewVideo.load();
    updateNavigation();
  }

  function openAt(index) {
    opener = playlist[index].trigger;
    displayItem(index);
    dialog.showModal();
    close.focus();
  }

  function closePreview() {
    if (dialog.open) {
      dialog.close();
    }
  }

  triggers.forEach((trigger, index) => {
    trigger.addEventListener("click", () => openAt(index));
  });
  previous.addEventListener("click", () => displayItem(activeIndex - 1));
  next.addEventListener("click", () => displayItem(activeIndex + 1));
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
    previewVideo.pause();
    previewVideo.removeAttribute("src");
    previewVideo.load();
    activeIndex = -1;
    updateNavigation();
    if (opener) {
      opener.focus();
    }
    opener = null;
  });
  previewVideo.addEventListener("error", () => {
    const item = playlist[activeIndex];
    previewError.textContent = item ? `无法播放：${item.title}` : "无法播放视频";
    previewError.hidden = false;
  });
})();
