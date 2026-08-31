(function () {
  const bindUpload = (options) => {
    const {
      zoneId,
      inputId,
      listId,
      buttonId,
      progressId,
      uploadUrl,
      redirectUrl,
      ext,
    } = options;
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    const button = document.getElementById(buttonId);
    const progress = progressId ? document.getElementById(progressId) : null;
    const progressBar = progress ? progress.querySelector(".upload-progress-bar") : null;
    const progressText = progress ? progress.querySelector(".upload-progress-text") : null;
    if (!zone || !input || !list || !button) {
      return;
    }

    const selected = [];
    const allowedExt = Array.isArray(ext) ? ext : [ext];
    const isAllowed = (file) => allowedExt.some((item) => file.name.toLowerCase().endsWith(item));
    const extLabel = allowedExt.join(" / ");
    const fileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;
    const originalButtonText = button.textContent;

    const setProgress = (percent) => {
      if (!progress || !progressBar || !progressText) {
        return;
      }
      const value = Math.max(0, Math.min(100, Math.round(percent)));
      progress.hidden = false;
      progressBar.style.width = `${value}%`;
      progressText.textContent = `${value}%`;
    };

    const resetProgress = () => {
      if (!progress || !progressBar || !progressText) {
        return;
      }
      progress.hidden = true;
      progressBar.style.width = "0%";
      progressText.textContent = "0%";
    };

    const renderList = () => {
      if (selected.length === 0) {
        list.innerHTML = '<div class="upload-empty">尚未选择文件</div>';
        resetProgress();
        return;
      }
      list.innerHTML = "";
      selected.forEach((file) => {
        const row = document.createElement("div");
        row.className = "upload-item";
        row.innerHTML = `
          <span class="upload-name"></span>
          <button class="btn ghost upload-remove" type="button">移除</button>
        `;
        row.querySelector(".upload-name").textContent = file.name;
        row.querySelector(".upload-remove").addEventListener("click", () => {
          const index = selected.findIndex((item) => fileKey(item) === fileKey(file));
          if (index >= 0) {
            selected.splice(index, 1);
            renderList();
          }
        });
        list.appendChild(row);
      });
    };

    const addFiles = (files) => {
      const invalid = files.filter((file) => !isAllowed(file));
      if (invalid.length) {
        alert(`仅允许 ${extLabel} 文件`);
      }
      files.filter(isAllowed).forEach((file) => {
        const key = fileKey(file);
        if (!selected.some((item) => fileKey(item) === key)) {
          selected.push(file);
        }
      });
      renderList();
    };

    const resetButton = () => {
      button.disabled = false;
      button.textContent = originalButtonText;
    };

    const uploadSelected = () => {
      if (selected.length === 0) {
        alert("请先选择文件");
        return;
      }
      button.disabled = true;
      button.textContent = "上传中...";
      setProgress(0);
      const form = new FormData();
      selected.forEach((file) => form.append("files", file));
      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadUrl);
      xhr.withCredentials = true;
      if (window.aiTvCsrfToken) {
        xhr.setRequestHeader("X-CSRF-Token", window.aiTvCsrfToken);
      }
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          setProgress((event.loaded / event.total) * 100);
        }
      });
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 400) {
          setProgress(100);
          window.location = redirectUrl;
          return;
        }
        alert(xhr.responseText || "上传失败");
        resetButton();
      });
      xhr.addEventListener("error", () => {
        alert("上传失败，请检查网络");
        resetButton();
      });
      xhr.send(form);
    };

    zone.addEventListener("click", () => input.click());
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      zone.classList.add("dragover");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      zone.classList.remove("dragover");
      addFiles(Array.from(event.dataTransfer.files || []));
    });
    input.addEventListener("change", () => {
      addFiles(Array.from(input.files || []));
      input.value = "";
    });
    button.addEventListener("click", uploadSelected);
    renderList();
  };

  window.bindUpload = bindUpload;
})();
