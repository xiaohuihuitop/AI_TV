<script>
import { createAppUpdateService } from "./utils/updateService.js";

const appUpdateService = createAppUpdateService();
let launchTimer = null;
let launchCheckPending = false;

function runUpdateCheck() {
  appUpdateService.check().catch((error) => {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn("[app-update] 生命周期检查失败", error);
    }
  });
}

export default {
  onLaunch() {
    launchCheckPending = true;
    launchTimer = setTimeout(() => {
      launchTimer = null;
      launchCheckPending = false;
      runUpdateCheck();
    }, 2000);
  },
  onShow() {
    if (!launchCheckPending && launchTimer === null) {
      runUpdateCheck();
    }
  },
  onHide() {
    if (launchTimer !== null) {
      clearTimeout(launchTimer);
      launchTimer = null;
      launchCheckPending = false;
    }
  }
};
</script>

<style>
:root,
page {
  --color-bg: #f6f2ec;
  --color-bg-soft: #fbf9f6;
  --color-surface: #ffffff;
  --color-surface-muted: #f3eee7;
  --color-surface-strong: #ebe4da;
  --color-text: #28231e;
  --color-muted: #6c6258;
  --color-accent: #a84616;
  --color-accent-soft: #d06a2b;
  --color-border: rgba(40, 35, 30, 0.16);
  --color-border-subtle: rgba(40, 35, 30, 0.1);
  --color-glow: rgba(168, 70, 22, 0.18);
  --radius-card: 14px;
  --radius-pill: 12px;
  --radius-soft: 10px;
  --shadow-card: 0 8px 20px rgba(40, 35, 30, 0.08);
  --shadow-soft: 0 4px 12px rgba(40, 35, 30, 0.06);
  --shadow-float: 0 12px 28px rgba(40, 35, 30, 0.12);
  --control-height: 48px;
  --duration-fast: 160ms;
  --font-display: "Noto Serif SC", "Source Serif 4", "Source Han Serif SC", serif;
  --font-body: "Noto Sans SC", "Source Sans 3", "PingFang SC", "Microsoft YaHei",
    sans-serif;
}

page {
  background-color: var(--color-bg);
  background-image: linear-gradient(180deg, #f6f2ec 0%, #fbf9f6 56%, #ffffff 100%);
  color: var(--color-text);
  font-family: var(--font-body);
}

view,
text,
image,
button,
input,
scroll-view,
web-view {
  box-sizing: border-box;
}

html,
body,
#app,
page,
.app-page,
.uni-page-body,
.uni-page-wrapper {
  max-width: 100%;
  overscroll-behavior-x: none;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

html::-webkit-scrollbar,
body::-webkit-scrollbar,
#app::-webkit-scrollbar,
page::-webkit-scrollbar,
.app-page::-webkit-scrollbar,
.uni-page-body::-webkit-scrollbar,
.uni-page-wrapper::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.app-page {
  width: 100%;
  max-width: 720px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 16px 16px calc(24px + env(safe-area-inset-bottom));
}

.card {
  width: 100%;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.panel {
  width: 100%;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-soft);
}

.hero {
  padding: 14px 16px;
  border-left: 3px solid var(--color-accent);
  background: transparent;
}

.btn {
  min-width: 0;
  min-height: var(--control-height);
  margin: 0;
  padding: 0 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-soft);
  background: var(--color-surface-muted);
  color: var(--color-text);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background-color var(--duration-fast) ease, box-shadow var(--duration-fast) ease,
    border-color var(--duration-fast) ease, color var(--duration-fast) ease;
}

.btn::after {
  border: none;
}

.btn-primary {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: #ffffff;
  box-shadow: 0 4px 10px var(--color-glow);
}

.btn-ghost {
  border-color: var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
}

.btn[disabled] {
  opacity: 0.45;
}

.muted {
  color: var(--color-muted);
}

@media (max-width: 359px) {
  .app-page {
    padding-right: 12px;
    padding-left: 12px;
  }

  .card,
  .panel {
    padding: 14px;
  }

  .btn {
    min-height: 44px;
    padding-right: 12px;
    padding-left: 12px;
  }
}

@media (min-width: 600px) {
  .app-page {
    padding-right: 24px;
    padding-left: 24px;
  }
}

@keyframes rise-fade {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
