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
  let timer = null;
  let refreshInFlight = null;

  const stopPolling = () => {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };

  const clearWatchParameter = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("watch");
    window.history.replaceState({}, "", url.toString());
    return url.toString();
  };

  const startPolling = () => {
    if (stopped || timer !== null || !polling || document.hidden) {
      return;
    }
    timer = window.setInterval(refresh, 2500);
  };

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

    if (shouldWatch && activeCount === 0) {
      clearWatchParameter();
    }

    if (previousActive > 0 && activeCount === 0) {
      stopped = true;
      stopPolling();
      window.setTimeout(() => window.location.replace(window.location.href), 800);
      return;
    }

    if (activeCount === 0) {
      polling = false;
      stopPolling();
    } else {
      polling = true;
      startPolling();
    }
    previousActive = activeCount;
  };

  const refresh = () => {
    if (stopped) {
      return Promise.resolve();
    }
    if (refreshInFlight) {
      return refreshInFlight;
    }
    refreshInFlight = fetch(endpoint, { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) {
          return null;
        }
        return response.json();
      })
      .then((payload) => {
        if (payload && !stopped) {
          render(payload);
        }
      })
      .catch(() => {
        setText(note, "状态刷新失败，稍后会自动重试。");
      })
      .finally(() => {
        refreshInFlight = null;
      });
    return refreshInFlight;
  };

  refresh();
  startPolling();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopPolling();
      return;
    }
    refresh();
    startPolling();
  });
})();
