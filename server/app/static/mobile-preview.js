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

  function displayItem(index) {
    activeIndex = index;
    const item = playlist[index];
    previewTitle.textContent = `手机播放预览：${item.title}`;
    previewPhone.classList.toggle("is-landscape", item.width > item.height);
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
