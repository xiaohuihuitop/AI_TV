# 图文 Markdown 渲染设计

**目标**
- 在图文阅读页支持完整 Markdown（标题、列表、引用、代码块、表格、图片、链接等），并保持浅色主题可读性。

**方案概述**
- 引入 `mp-html` 组件解析 Markdown，并在 `frontend/pages/reader/index.vue` 使用 `<mp-html>` 替代纯文本渲染。
- 继续沿用现有 `readTextContent` 数据读取逻辑，保证在线与离线一致。

**关键设计**
- 组件：将 `mp-html` 放入 `frontend/uni_modules/mp-html/components/mp-html`，在阅读页通过 `components` 注册并使用。
- 渲染：模板使用 `<mp-html>`，传入 `content`、`markdown`、`selectable`、`preview-img` 等配置。
- 相对资源：新增 `contentDomain` 计算逻辑。
  - `source` 为 `http/https`：取 `origin + 路径目录`（如 `https://a/b/c.md` → `https://a/b/`）。
  - 本地离线文件：保持为空，避免错误拼接。
- 安全：保持默认禁用原始 HTML 执行，仅渲染安全 Markdown 标签。

**数据流**
1. `onLoad` 读取 `src/title` 并设置状态。
2. `readTextContent` 获取文本内容。
3. `mp-html` 解析并渲染 Markdown。
4. 异常与空内容维持现有提示与加载状态。

**样式与体验**
- 通过 `container-style` 与 `tag-style` 调整标题、列表、引用、代码块的间距与字体，匹配浅色主题。
- 开启图片预览，建议配置图片懒加载（按组件支持项设置）。

**测试与验证**
- 新增 `AI_TOOL` 测试脚本检查：
  - 阅读页是否引入 `mp-html`、使用 `<mp-html>`、启用 `markdown`、设置 `contentDomain`。
- 手动验证：
  - 在线 Markdown 文件渲染完整（含图片/表格/代码）。
  - 离线文件可正常渲染，错误内容有提示且不崩溃。