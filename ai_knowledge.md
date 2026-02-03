# AI 经验库

> 目的：把已解决的问题沉淀为可检索知识，避免下次重踩。

## 模板
```
## [YYYY-MM-DD] 现象: <简述>
- 触发条件:
- 根因:
- 解决步骤:
- 预防/规则:
- 关联文件:
- 标签:
- 关键词:
```

## [2026-02-02] 现象: App 与服务端协议不匹配
- 触发条件: App 仅支持 index.json 直链清单，服务端 API 返回内部字段且要求 Basic Auth
- 根因: 协议目标不同（后台管理/上传 vs 内容分发/消费）
- 解决步骤: 新增 public 清单协议与资源直链，沿用同一账号密码，输出 App 所需字段
- 预防/规则: 客户端落地前先定义清单协议并保持向后兼容
- 关联文件: server/app/api/public_routes.py, server/app/core/auth.py, server/app/main.py, server/Doc/README_2026_02_02_14_31_技术交接.md
- 标签: 协议, 兼容性, 鉴权
- 关键词: index.json, public, BasicAuth

## [2026-02-03] 现象: 离线文档无法显示
- 触发条件: 文档下载后使用本地路径读取，内容为 HTML，但阅读页固定按 Markdown 渲染
- 根因: 渲染模式与内容格式不匹配，且离线场景丢失源地址导致域名无法推断
- 解决步骤: 传递内容格式与源地址参数；阅读页按格式切换渲染并基于源地址计算域名
- 预防/规则: 下载保存时保留原始 URL 与格式信息；阅读页根据格式渲染
- 关联文件: android/pages/latest/index.vue, android/pages/offline/index.vue, android/pages/reader/index.vue
- 标签: 离线, 渲染, 兼容性
- 关键词: markdown, html, local_path, origin

## [2026-02-03] 现象: 离线页样式编译报错 Unknown word
- 触发条件: Vite 构建解析 `offline/index.vue` 样式块
- 根因: JS 函数误插入到 `<style>` 区域导致 PostCSS 解析失败
- 解决步骤: 将函数移回 `<script>`，清理样式块
- 预防/规则: 变更后检查组件结构区块边界（template/script/style）
- 关联文件: android/pages/offline/index.vue
- 标签: 构建, 样式, 误插入
- 关键词: postcss, unknown word, vue

## [2026-02-03] 现象: 离线图文本地读取失败
- 触发条件: 下载后的文档在离线页面打开时提示“内容加载失败”
- 根因: 本地文件路径在不同平台包含 `file://` 前缀与否不一致，读取路径不兼容
- 解决步骤: 读取时同时尝试原始路径与去前缀路径
- 预防/规则: 本地路径处理需兼容多平台格式
- 关联文件: android/pages/reader/index.vue
- 标签: 离线, 文件系统, 兼容性
- 关键词: file://, readFile, uni

## [2026-02-03] 现象: 后台选择文件后未点击上传却自动上传
- 触发条件: 再次点击选择文件或触发 change 事件
- 根因: 前端脚本在 `change/drop` 时立即调用上传接口
- 解决步骤: 引入待上传列表与手动上传按钮，支持移除
- 预防/规则: 上传应显式由用户触发，文件选择仅更新列表
- 关联文件: server/app/templates/videos.html, server/app/templates/docs.html, server/app/static/app.css
- 标签: 后台, 上传, 交互
- 关键词: drag, change, upload

## [2026-02-03] 现象: 离线图文读取失败仍未定位
- 触发条件: 离线页面打开图文提示“内容加载失败”
- 根因: 待确认，疑似路径编码或平台差异
- 解决步骤: 增加路径解码与错误信息输出以便定位
- 预防/规则: 读取失败应输出关键路径信息
- 关联文件: android/pages/reader/index.vue
- 标签: 离线, 调试, 路径
- 关键词: decode, readFile, error
