(function () {
  const root = document.querySelector("[data-video-tasks]");
  if (!root) {
    return;
  }

  const endpoint = root.dataset.endpoint || "/api/videos/tasks";
  const shouldWatch = root.dataset.watch === "1";
  const countNodes = root.querySelectorAll("[data-task-count]");
  const list = root.querySelector("[data-task-list]");
  const empty = root.querySelector("[data-task-empty]");
  const note = root.querySelector("[data-task-note]");
  let previousActive = Number(root.dataset.activeCount || "0");
  let polling = shouldWatch || previousActive > 0;
  let stopped = false;

  const setText = (node, text) => {
    if (node) {
      node.textContent = text;
    }
  };

  const buildItem = (item) => {
    const row = document.createElement("div");
    row.className = "task-item";

    const main = document.createElement("div");
    main.className = "task-item-main";

    const title = document.createElement("a");
    title.className = "task-item-title";
    title.href = item.detail_url;
    title.textContent = item.filename;

    const message = document.createElement("div");
    message.className = "task-item-message";
    message.textContent = item.message || item.created_at || "";

    main.append(title, message);

    const side = document.createElement("div");
    side.className = "task-item-side";

    const state = document.createElement("span");
    state.className = `task-state ${item.status_class || ""}`;
    state.textContent = item.status_label || item.status;
    side.appendChild(state);

    if (item.retry_url) {
      const retryForm = document.createElement("form");
      retryForm.className = "inline-form";
      retryForm.method = "post";
      retryForm.action = item.retry_url;
      if (window.aiTvCsrfToken) {
        const csrf = document.createElement("input");
        csrf.type = "hidden";
        csrf.name = "_csrf_token";
        csrf.value = window.aiTvCsrfToken;
        retryForm.appendChild(csrf);
      }
      const retry = document.createElement("button");
      retry.className = "btn ghost task-retry";
      retry.type = "submit";
      retry.textContent = "重新识别";
      retryForm.appendChild(retry);
      side.appendChild(retryForm);
    }

    row.append(main, side);
    return row;
  };

  const render = (payload) => {
    countNodes.forEach((node) => {
      const key = node.dataset.taskCount;
      node.textContent = payload.counts && payload.counts[key] !== undefined ? payload.counts[key] : "0";
    });

    if (list) {
      list.textContent = "";
      (payload.items || []).forEach((item) => list.appendChild(buildItem(item)));
    }

    const hasItems = payload.items && payload.items.length > 0;
    if (empty) {
      empty.hidden = hasItems;
    }

    const activeCount = Number(payload.active_count || 0);
    setText(
      note,
      activeCount > 0
        ? "页面会自动刷新识别状态，处理完成后会更新封面和信息。"
        : "当前没有等待识别的视频。"
    );

    if (previousActive > 0 && activeCount === 0) {
      stopped = true;
      window.setTimeout(() => window.location.reload(), 800);
      return;
    }

    previousActive = activeCount;
    polling = polling || activeCount > 0;
  };

  const refresh = async () => {
    if (stopped) {
      return;
    }
    try {
      const response = await fetch(endpoint, { credentials: "same-origin" });
      if (!response.ok) {
        return;
      }
      render(await response.json());
    } catch (error) {
      setText(note, "状态刷新失败，稍后会自动重试。");
    }
  };

  refresh();
  if (polling) {
    window.setInterval(refresh, 2500);
  }
})();
