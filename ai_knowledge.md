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

## [2026-02-03] 现象: 当前环境不支持本地读取
- 触发条件: 离线页面打开图文提示“当前环境不支持本地读取”
- 根因: `uni.getFileSystemManager` 在部分运行环境不可用
- 解决步骤: 增加 app-plus `plus.io` 读取兜底
- 预防/规则: 本地读取需覆盖多端能力差异
- 关联文件: android/pages/reader/index.vue
- 标签: 离线, 平台, 兼容性
- 关键词: app-plus, plus.io, getFileSystemManager

## [2026-02-03] 现象: 离线图文卡在加载中
- 触发条件: 离线页面打开图文，加载状态不结束
- 根因: 待定位，可能与本地路径格式或运行环境能力有关
- 解决步骤: 增加 plus 读取路径候选（file:// 与 convertLocalFileSystemURL）与超时兜底
- 预防/规则: 调试信息应覆盖本地路径与能力判断
- 关联文件: android/pages/reader/index.vue
- 标签: 离线, 调试, 读取
- 关键词: local_path, plus, getFileSystemManager

## [2026-02-03] 现象: _doc 路径无法读取
- 触发条件: 本地路径以 `_doc/` 开头时读取失败
- 根因: `_doc/` 需映射到 App 沙箱绝对路径
- 解决步骤: 使用 `plus.io.convertLocalFileSystemURL("_doc/")` 映射前缀并尝试读取
- 预防/规则: 保存路径使用绝对路径或统一转换
- 关联文件: android/pages/reader/index.vue
- 标签: 离线, 路径, 兼容性
- 关键词: _doc, convertLocalFileSystemURL

## [2026-02-03] 现象: convertLocalFileSystemURL 返回无前缀路径
- 触发条件: `plus.io.convertLocalFileSystemURL` 返回 `/storage/...` 形式
- 根因: 部分环境未自动补 `file://` 前缀
- 解决步骤: 为转换结果补齐 `file://` 前缀作为候选
- 预防/规则: 路径候选需覆盖带/不带前缀的两种形式
- 关联文件: android/pages/reader/index.vue
- 标签: 离线, 路径, 兼容性
- 关键词: file://, convertLocalFileSystemURL

## [2026-02-03] 现象: 离线图文仍无法读取
- 触发条件: 离线页面打开本地 HTML，提示“内容加载失败”
- 根因: App-Plus 环境下 JS 层读取本地 HTML 不稳定（FileReader/plus.io 读取失败），但原生组件可直接访问文件
- 解决步骤: 离线 HTML 改用 web-view 直接加载本地 file:// 地址，跳过 JS 读取
- 预防/规则: 本地资源优先交给原生/组件加载，避免在 service 层手动读文本
- 关联文件: android/pages/reader/index.vue
- 标签: 离线, web-view, 本地文件
- 关键词: file://, plus, FileReader

## [2026-02-03] 现象: 离线图文显示源码
- 触发条件: web-view 打开离线文档后显示 HTML 源码而非渲染结果
- 根因: 文档下载保存路径无 .html 扩展，WebView 按 text/plain 处理
- 解决步骤: 下载后重命名/移动本地文件并补 .html 扩展；删除时增加 plus.io 兜底
- 预防/规则: 保存离线 HTML 需保留扩展名或指定 MIME
- 关联文件: android/utils/offlineService.js, android/pages/offline/index.vue
- 标签: 离线, web-view, 文件扩展名
- 关键词: html, extension, saveFile

## [2026-02-04] 现象: 离线图文 WebView 无法打开
- 触发条件: 离线页面打开图文，提示“请求的页面无法打开”
- 根因: 下载后的 `local_path` 指向 `uniapp_temp` 临时目录，重启/清理后文件失效
- 解决步骤: 文档下载后固定保存到 `_doc/article_<id>.html`，并使用该路径打开
- 预防/规则: 离线资源必须保存到持久目录（_doc），避免使用临时路径
- 关联文件: android/utils/offlineService.js, android/pages/latest/index.vue
- 标签: 离线, 路径, 持久化
- 关键词: uniapp_temp, _doc, saveFile, webview

## [2026-02-04] 现象: 离线 HTML 报 unsafe-eval
- 触发条件: WebView 打开离线 HTML 时出现 CSP 限制导致 EvalError
- 根因: 文档内包含 CSP meta（`Content-Security-Policy`）禁止 `unsafe-eval`，而 App 注入脚本或页面脚本使用了 eval
- 解决步骤: 下载后写入 `_doc` 前清理 CSP meta，再保存为离线文件
- 预防/规则: 离线 HTML 需去除 CSP meta 或使用静态渲染内容
- 关联文件: android/utils/offlineService.js
- 标签: 离线, CSP, web-view
- 关键词: unsafe-eval, Content-Security-Policy, html

## [2026-02-04] 现象: 已下载离线 HTML 仍报 unsafe-eval
- 触发条件: 旧离线文件已存在 CSP meta，新版本仍会报错
- 根因: CSP 清理只在下载时执行，旧文件未被清理
- 解决步骤: 阅读页打开本地 HTML 时二次清理 CSP meta 并覆盖写回
- 预防/规则: 对历史离线文件提供兼容修复路径
- 关联文件: android/pages/reader/index.vue
- 标签: 离线, CSP, 兼容性
- 关键词: sanitize, webview, local html

## [2026-02-04] 现象: 离线显示 100% 但无法打开
- 触发条件: 下载过程完成但保存失败，local_path 为空
- 根因: 保存失败仍标记进度 100% 且 status=done
- 解决步骤: 保存失败标记为 failed 并提示重新下载
- 预防/规则: 离线条目必须以 local_path 是否存在判定成功
- 关联文件: android/utils/offlineService.js, android/pages/offline/index.vue
- 标签: 离线, 下载, 状态
- 关键词: local_path, failed, progress

## [2026-02-05] 现象: 密码错误仍可看到清单并播放在线内容
- 触发条件: App 设置错误密码后进入最新页
- 根因: 最新页请求失败回退到缓存，缓存内 URL 含正确凭证
- 解决步骤: 认证失败(401/403)时清空缓存与列表，显示“无更新”
- 预防/规则: 认证失败不允许使用缓存清单
- 关联文件: android/pages/latest/index.vue
- 标签: 认证, 缓存, 安全
- 关键词: index_cache, 401, public

## [2026-02-05] 现象: 视频横竖屏判断不准
- 触发条件: 设备录制视频带旋转元数据时，宽高与实际显示方向相反
- 根因: 仅使用 width/height 判断方向，忽略 rotate/display matrix
- 解决步骤: ffprobe 读取 rotate/side_data_list，但横屏仍强制旋转，旋转后清除 rotate 元数据
- 预防/规则: 横屏视频强制旋转并清理旋转元数据；已上传的视频需手动触发重新处理
- 关联文件: server/app/services/video_processing.py
- 标签: 视频处理, 旋转, 元数据
- 关键词: ffprobe, rotate, display matrix

## [2026-02-05] 现象: 封面与视频方向不一致
- 触发条件: 视频带旋转元数据但未物理旋转，封面由 ffmpeg 自动旋转生成
- 根因: 旋转判断使用显示尺寸导致未旋转视频；封面自动应用旋转元数据
- 解决步骤: 以原始宽高判断横屏并物理旋转；旋转后清除 rotate 元数据
- 预防/规则: 旋转后必须清理 rotate 元数据以避免封面/播放方向不一致
- 关联文件: server/app/services/video_processing.py
- 标签: 封面, 旋转, 元数据
- 关键词: rotate, cover, ffmpeg

## [2026-02-05] 现象: 离线下载条目被覆盖/消失
- 触发条件: 最新页连续触发多个下载，离线页条目闪烁、数量变动，部分条目消失或进度停滞
- 根因: offlineService.addDownload 使用闭包 list 保存进度，多任务并发时互相覆盖存储
- 解决步骤: 更新条目时每次从存储读取最新列表，再写回
- 预防/规则: 并发写入本地存储必须基于最新快照更新
- 关联文件: android/utils/offlineService.js, AI_TOOL/offline_download_race_test.mjs
- 标签: 离线, 下载, 并发, 存储
- 关键词: download_items, list覆盖, 进度

## [2026-02-06] 现象: 服务器关闭时离线页封面不显示
- 触发条件: 服务器不可用或断网时打开离线页
- 根因: 离线下载未保存封面本地路径，封面解析未优先使用本地资源
- 解决步骤: 视频下载完成后尝试下载封面并保存 cover_local_path；封面解析优先读取 cover_local_path
- 预防/规则: 离线展示优先使用本地路径；封面下载失败不影响主流程
- 关联文件: android/utils/offlineService.js, android/utils/indexService.js, android/pages/offline/index.vue
- 标签: 离线, 封面, 下载
- 关键词: cover_local_path, resolveCoverUrl

## [2026-02-06] 现象: 最新页断网时封面不显示
- 触发条件: 断网打开最新页，列表来自缓存但封面为远端地址
- 根因: 最新页未使用离线下载的本地封面
- 解决步骤: 下载状态映射携带 cover_local_path，最新页渲染时优先使用本地封面
- 预防/规则: 在线列表渲染时对已下载条目优先使用本地资源
- 关联文件: android/utils/offlineService.js, android/utils/indexService.js, android/pages/latest/index.vue
- 标签: 离线, 封面, 最新页
- 关键词: cover_local_path, downloadStatusMap
