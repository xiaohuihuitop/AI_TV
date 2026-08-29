<script>
export default {
  onLaunch() {}
};
</script>

<style>
:root,
page {
  --color-bg: #eee3d6;
  --color-bg-soft: #f8f1e8;
  --color-surface: #ffffff;
  --color-surface-strong: #f3ede5;
  --color-text: #1f1b16;
  --color-muted: #544a40;
  --color-accent: #8a360e;
  --color-accent-soft: #c05621;
  --color-border: rgba(31, 27, 22, 0.18);
  --color-glow: rgba(138, 54, 14, 0.28);
  --radius-card: 18px;
  --radius-pill: 999px;
  --radius-soft: 14px;
  --shadow-card: 0 18px 40px rgba(31, 27, 22, 0.12);
  --shadow-soft: 0 10px 24px rgba(31, 27, 22, 0.08);
  --shadow-float: 0 24px 48px rgba(31, 27, 22, 0.16);
  --duration-fast: 200ms;
  --font-display: "Noto Serif SC", "Source Serif 4", "Source Han Serif SC", serif;
  --font-body: "Noto Sans SC", "Source Sans 3", "PingFang SC", "Microsoft YaHei",
    sans-serif;
}

page {
  background-color: var(--color-bg);
  background-image: linear-gradient(180deg, #eee3d6 0%, #f8f1e8 52%, #fbf7f2 100%);
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
  padding: 20px 16px calc(32px + env(safe-area-inset-bottom));
}

.card {
  width: 100%;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: var(--shadow-card);
}

.panel {
  width: 100%;
  min-width: 0;
  padding: 18px;
  border: 1px solid rgba(31, 27, 22, 0.1);
  border-radius: var(--radius-card);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: var(--shadow-soft);
}

.hero {
  padding: 16px 18px;
  border: 1px solid rgba(31, 27, 22, 0.1);
  border-radius: var(--radius-card);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: var(--shadow-soft);
}

.btn {
  min-width: 0;
  min-height: 54px;
  margin: 0;
  padding: 0 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: rgba(31, 27, 22, 0.04);
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
  border-color: rgba(138, 54, 14, 0.5);
  background: linear-gradient(135deg, #8a360e 0%, #c05621 100%);
  color: #ffffff;
  box-shadow: 0 10px 22px rgba(138, 54, 14, 0.28);
}

.btn-ghost {
  border-color: rgba(31, 27, 22, 0.18);
  background: rgba(255, 255, 255, 0.72);
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
    min-height: 50px;
    padding-right: 14px;
    padding-left: 14px;
  }
}

@media (min-width: 600px) {
  .app-page {
    padding-right: 24px;
    padding-left: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
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
