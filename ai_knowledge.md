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

## [2026-10-05] 现象: 自动缓存和图文入口对长辈仍显得复杂
- 触发条件: 自动缓存已经替代手动下载，但底部仍显示缓存入口，最新页仍显示图文切换；用户希望只保留主要内容入口。
- 根因: UI 入口与底层兼容能力没有分层，缓存页和图文页的路由/协议能力不需要作为常驻入口暴露。
- 解决步骤: 从 `AppTabBar` 和 native `tabBar.list` 隐藏缓存；将 `pages/latest/index.vue` 的图文 tab 隐藏；把最新页设为首屏；保留 `/pages/offline/index`、`/pages/reader/index`、article/photo 清单处理、自动缓存服务和历史数据。
- 预防/规则: 简化 UI 时只移除入口，不删除路由、存储键或协议；用结构化 pages.json 断言同时保护首屏、隐藏 tab 和保留内部路由。
- 关联文件: android/components/AppTabBar.vue, android/pages.json, android/pages/latest/index.vue, AI_TOOL/android_ui_cleanup_test.mjs, docs/project/进度.md
- 标签: android, ui, simplification, cache, article, compatibility
- 关键词: hide entry, cache route, reader route, latest first page, tabBar list

- 触发条件: 源码已将最新页手动下载入口改为自动缓存状态，但 MuMu 页面仍出现“下载”按钮。
- 根因: 本地源码与设备运行 bundle 不一致；设备仍加载旧 bundle。复查中 MuMu 虚拟机 ADB 会话卡死，重启虚拟机后 `wlan0` 处于 DOWN 状态，导致 ADB 持续 `offline`、无法同步；`6fce6ce` 是 Redmi 真机，不能作为 MuMu 验收对象。
- 解决步骤: 对照源码、回归断言和新旧 bundle 文案确认页面已移除按钮；通过 MuMu 管理通道发现 `wlan0` DOWN 后执行 `svc wifi enable` 和 `ip link set wlan0 up`，虚拟机网络恢复（10.0.2.15），ADB 恢复 `device` 状态；重建 `adb reverse tcp:8000` 后用 HBuilderX `--deviceId 127.0.0.1:16384` 重新同步，设备截图确认无下载按钮、底部为“缓存”。
- 预防/规则: “源码已修复”不等于“设备已加载新包”；MuMu 验收前先确认 ADB 序列号为 `127.0.0.1:16384` 且状态为 `device`，再检查设备端页面截图。ADB offline 且虚拟机已启动时，先用 `mumu-cli sh` 检查虚拟机网络接口状态。设备列表中有真机时禁止默认选择第一个设备。
- 关联文件: android/pages/latest/index.vue, android/components/AppTabBar.vue, android/unpackage/dist/dev/app-plus/app-service.js, AI_TOOL/android_ui_cleanup_test.mjs, docs/project/进度.md
- 标签: android, mumu, emulator, bundle, download, cache, adb, wlan
- 关键词: 127.0.0.1:16384, offline, stale bundle, app-service.js, wlan0 down, mumu-cli, HBuilderX

## [2026-10-04] 现象: 长辈需要手动点击下载才能断网使用内容
- 触发条件: 现有 Android 只有视频“下载”按钮；照片查看器、图文阅读没有持久化资源缓存，长辈需要理解下载/离线概念。
- 根因: `download_items` 是视频专用的显式下载记录，图片只保存相册 JSON，HTML 直接远端 WebView，Markdown 直接网络读取；没有统一资源身份、容量上限、来源隔离和清理策略。
- 解决步骤: 新增独立 `resourceCacheService` 和运行时适配层；默认自动缓存开启且仅 Wi-Fi，按打开的视频/相册/图文触发；缓存记录使用 type+id+规范化 URL 身份，支持同 identity 并发锁、文件校验、进程中断恢复、LRU/容量清理；设置页和离线页提供开关、用量与清理入口；视频/照片/Markdown/HTML 分别覆盖本地路径并保留远端回退。经用户确认，缓存上限上调为 10GB/100 项，且已存设置只保留开关、上限始终跟随代码默认值。
- 预防/规则: 自动缓存不能复用或删除用户手动离线记录；不能把页面定时器描述为系统级后台下载，App 被杀后续任务需要原生 WorkManager/Service；HTML 本地 WebView 必须有远端回退；缓存本地路径不能写回公共清单或跨服务器复用；持久化配置不要固定容量上限，避免默认值上调后旧设备不生效。
- 关联文件: android/utils/resourceCacheService.js, android/utils/resourceCacheRuntime.js, android/pages/latest/index.vue, android/pages/photos/index.vue, android/pages/reader/index.vue, android/pages/settings/index.vue, android/pages/offline/index.vue, AI_TOOL/resource_cache_service_test.mjs
- 标签: android, cache, offline, video, photo, article, wifi, lru
- 关键词: resource_cache_items, automatic cache, cache-on-open, Wi-Fi, 10GB, 100 items, local_path, WorkManager

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

## [2026-02-06] 现象: 恢复网络后最新页封面仍不加载
- 触发条件: 断网导致封面请求失败后恢复网络并刷新最新页
- 根因: 封面地址未变化，image 组件未触发重新加载
- 解决步骤: 对远端封面追加刷新参数 `_t`，每次刷新强制变更 URL
- 预防/规则: 恢复网络场景需触发资源 URL 变化或显式重载
- 关联文件: android/utils/indexService.js, android/pages/latest/index.vue
- 标签: 封面, 刷新, 最新页
- 关键词: cache buster, _t

## [2026-05-04] 现象: 手机端离线下载视频提示下载失败 400
- 触发条件: 手机端调用 `uni.downloadFile` 下载 public 视频文件，服务端收到移动端 Range 请求
- 根因: 服务端 Range 解析只支持简单单段格式，遇到多段 Range 或异常 Range 时解析失败，导致下载接口返回错误
- 解决步骤: Range 解析改为只取首段，兼容 `bytes=0-`、`bytes=-1024`、`bytes=0-0,-1` 与非法 Range 兜底；补充 `AI_TOOL/range_parse_test.mjs`
- 预防/规则: 视频下载接口必须兼容移动端和播放器可能发送的不同 Range 头，Range 解析失败不应导致整次下载失败
- 关联文件: server/app/services/range.py, AI_TOOL/range_parse_test.mjs
- 标签: 下载, Range, 移动端, 服务端
- 关键词: uni.downloadFile, Range, 400, parse_range

## [2026-06-06] 现象: 上传进度完成后仍看不到视频封面和信息
- 触发条件: 后台上传大视频，浏览器进度到 100% 后跳回视频列表，但后台 worker 仍在生成封面、时长和尺寸
- 根因: 浏览器上传进度只表示文件传输完成，不代表服务端视频处理完成；原页面没有处理队列和轮询反馈
- 解决步骤: 新增 `/api/videos/tasks` 输出 pending/processing/failed 任务摘要；视频管理页新增“处理队列与日志”面板；上传视频后跳转到带监听参数的列表页；前端轮询任务状态并在 active 任务归零时刷新列表
- 预防/规则: 大文件上传类功能应区分“传输进度”和“后台处理状态”，两者需要分别展示
- 关联文件: server/app/services/video_tasks.py, server/app/api/routes.py, server/app/web/routes.py, server/app/templates/videos.html, server/app/static/video-tasks.js, server/app/static/upload.js
- 标签: 服务端, 上传, 后台处理, 队列
- 关键词: upload progress, pending, processing, video tasks, worker

## [2026-06-07] 现象: 服务端镜像命名需要固定为 latest
- 触发条件: 推送 `build-*` tag 触发 GitHub Actions 构建服务端 Docker 镜像
- 根因: 版本化 tar 文件和版本化镜像 tag 会增加部署时修改 compose 的成本；用户希望下载文件和镜像标签固定
- 解决步骤: 工作流产物固定为 `ai_tv_server_latest.tar`，镜像标签固定为 `ai_tv_server:latest`，README 按 latest 部署方式说明
- 预防/规则: 服务端镜像自动构建默认只输出 latest；tag 仅用于触发构建和区分 Release，不作为 Docker 镜像 tag
- 关联文件: .github/workflows/server-image-build.yml, server/README.md
- 标签: 服务端, Docker, GitHub Actions, 部署
- 关键词: ai_tv_server_latest.tar, ai_tv_server:latest, build-*

## [2026-08-29] 现象: uni-app 客户端在不同屏幕下样式不一致或横向溢出
- 触发条件: HBuilderX 运行到 Android 模拟器后切换 320dp、360dp、600dp 或横屏尺寸
- 根因: 运行时全局样式放在 `uni.scss` 未稳定进入页面样式；列表使用不可收缩布局；播放器高度只按单一尺寸推算，未限制可用视口高度
- 解决步骤: 将全局页面样式迁移到 `App.vue`；列表和操作区使用带 `minmax(0, 1fr)` 的响应式 Grid；播放器高度取 16:9 高度与页面可用高度的较小值，并在窗口变化时重算
- 预防/规则: `uni.scss` 仅保存 Sass 变量和 mixin，运行时全局 CSS 放在 `App.vue`；固定媒体和按钮组必须同时验证窄屏、宽屏和横屏
- 关联文件: android/App.vue, android/utils/layout.js, android/pages/latest/index.vue, android/pages/player/index.vue, AI_TOOL/android_responsive_layout_test.mjs
- 标签: android, uni-app, 响应式, 横屏, 模拟器
- 关键词: App.vue, uni.scss, minmax, calculateVideoHeight, onResize

## [2026-08-29] 现象: 最新页顶部内容被遮挡且下拉只触发刷新
- 触发条件: 最新页向上滚动列表后再向下回顶，媒体切换控件仍停在导航栏下面；继续下拉触发原生刷新但页面不再移动
- 根因: `overflow-x: hidden` 同时应用到 `html/body/#app/page/.app-page/.uni-page-body/.uni-page-wrapper`；单轴 overflow 会使另一轴计算为 `auto`，多层元素因此形成纵向嵌套滚动，外层到顶时内层仍有滚动偏移
- 解决步骤: 移除多层页面容器的全局 `overflow-x: hidden`；保留 `max-width`、`min-width: 0` 和响应式 Grid 约束；增加禁止该全局声明的回归断言
- 预防/规则: uni-app 原生下拉刷新页面只能保留一个纵向滚动根；不要用多层全局 overflow 隐藏组件溢出，应在具体组件布局处消除溢出源
- 关联文件: android/App.vue, AI_TOOL/android_responsive_layout_test.mjs
- 标签: android, uni-app, 下拉刷新, 嵌套滚动, overflow
- 关键词: overflow-x hidden, overflow-y auto, enablePullDownRefresh, scroll root

## [2026-08-29] 现象: Android 视频播放后无法自动按方向全屏
- 触发条件: uni-app App 端在 `<video @loadedmetadata>` 中读取宽高并调用 `VideoContext.requestFullScreen`
- 根因: Android App 使用 HTML5+ 原生视频控件，该控件事件列表不包含 `loadedmetadata`，因此依赖该事件的自动全屏逻辑不会执行
- 解决步骤: 优先使用清单宽高，缺失时通过 `uni.getImageInfo` 读取方向一致的封面尺寸；记录目标方向并等待原生 `play` 事件后调用 `requestFullScreen`；继续使用 `object-fit="contain"` 并保留手动全屏按钮
- 预防/规则: uni-app App 原生组件行为必须以 App 端能力和真机/模拟器结果为准；视频自动全屏应在播放器开始播放后调用，不能只依赖 H5 元数据事件
- 关联文件: android/pages/player/index.vue, android/utils/layout.js, AI_TOOL/android_player_fullscreen_test.mjs
- 标签: android, uni-app, 视频, 自动全屏, 横竖屏
- 关键词: loadedmetadata, getImageInfo, requestFullScreen, contain

## [2026-08-29] 现象: 页面级全屏旋转后播放器高度坍缩
- 触发条件: App-Plus 播放横屏视频时，先调用 `plus.navigator.setFullscreen(true)` 和 `hideSystemNavigation()`，再调用 `plus.screen.lockOrientation("landscape-primary")`
- 根因: 系统栏先隐藏后再旋转时，uni-app 播放器页面 WebView 使用了错误的旋转中间高度；系统窗口已是 1920x1080，但页面 WebView 只有 1920x240，DOM 中的 `100vh` 也随之变为 80dp
- 解决步骤: 页面级播放器进入时先锁定视频方向，再隐藏状态栏和系统导航栏；退出时先锁回 `portrait-primary`，再恢复系统栏；视频和三个导航按钮使用上下独立布局；原生恢复任一步失败时保留活动状态供生命周期再次清理；沉浸页显式解除全局内容最大宽度
- 预防/规则: App-Plus 沉浸式页面的原生 API 调用顺序必须用模拟器或真机验证；方向锁定必须先于系统栏隐藏；原生 API 部分失败必须保留可重试状态；全屏组件必须覆盖全局容器的 `max-width`，不能只依赖 DOM 响应式测试
- 关联文件: android/utils/immersivePlayer.js, android/pages/player/index.vue, android/utils/layout.js, AI_TOOL/android_immersive_player_test.mjs, AI_TOOL/android_player_fullscreen_test.mjs
- 标签: android, uni-app, App-Plus, 沉浸式, 旋转, WebView
- 关键词: lockOrientation, setFullscreen, hideSystemNavigation, WebView height, 100vh

## [2026-08-30] 现象: 源码已修复但模拟器仍显示旧播放器
- 触发条件: HBuilderX 已生成新的 `app-plus` 编译产物，但模拟器页面仍出现视频区域坍缩或缺少最新系统栏恢复行为
- 根因: HBuilderX 监听进程生成了新的本地 `app-service.js`，但差量同步没有把该文件更新到模拟器，设备继续执行旧 bundle
- 解决步骤: 对比本地与设备端 `app-service.js` 的文件大小和本次代码标识；重新同步完整 `app-plus` 产物并重启调试基座；再执行原始复现步骤和视觉验收
- 预防/规则: App-Plus 真机或模拟器结果与源码不一致时，必须先验证设备端 bundle 版本；不能用本地编译成功替代设备部署成功
- 关联文件: android/unpackage/dist/dev/app-plus/app-service.js, android/utils/immersivePlayer.js, android/pages/player/index.vue
- 标签: android, uni-app, HBuilderX, 模拟器, 热更新
- 关键词: app-service.js, 差量同步, 旧 bundle, HBuilderX launch

## [2026-08-30] 现象: 服务端异常中断可能留下半文件、卡住任务或不一致数据
- 触发条件: 大文件上传超限或磁盘不足、删除时数据库提交失败、视频识别中容器重启，或运行中直接复制 WAL 模式数据库
- 根因: 上传曾整文件读入并直接写正式路径；文件删除先于数据库提交且无补偿；`processing` 状态没有启动恢复；SQLite 缺少锁等待和一致性备份流程
- 解决步骤: 上传分块写 `.part` 并原子替换，批次失败统一回滚；删除前同盘暂存，提交失败恢复；worker 条件更新领取并在启动时恢复中断任务；SQLite 启用 WAL、busy timeout 和版本迁移，使用 `sqlite3.Connection.backup` 备份并在停机状态校验恢复；Docker 使用非 root 用户和健康检查
- 预防/规则: 文件与数据库联合变更必须有明确提交顺序和补偿；后台任务状态必须可在进程重启后恢复；运行中的 SQLite 不可用普通文件复制作为一致备份；容器级能力必须在真实 Docker 环境补验
- 关联文件: server/app/services/uploads.py, server/app/services/media_delete.py, server/app/tasks/worker.py, server/app/db/session.py, server/app/services/database_backup.py, server/Dockerfile, server/README.md, AI_TOOL/server_reliability_test.py
- 标签: server, upload, sqlite, worker, docker, reliability
- 关键词: atomic replace, transaction rollback, WAL, backup, processing recovery, non-root

## [2026-09-01] 现象: 长辈手机无法依赖 GitHub 手动获取新版本
- 触发条件: 需要让 APK 内的页面和业务逻辑自动更新，但用户手机可能无法访问 GitHub，也不希望频繁手动安装 WGT
- 根因: GitHub Release 不是稳定的手机客户端更新入口，且 APK 与 WGT 的更新边界没有落地
- 解决步骤: 使用 `tv.xiaohuihuitop.top` 统一提供管理、public 清单和 WGT 更新；客户端 App-Plus 启动/回前台检查 HTTPS `update.json`，仅安装更高版本的 WGT；`/update/` 由反代直接提供宿主机持久化静态文件
- 预防/规则: WGT 只能更新页面、JS、CSS 和业务逻辑；发布顺序必须先上传 WGT 再发布 `update.json`；播放页不得自动重启；HTTPS 反代必须传递 `Host` 和 `X-Forwarded-Proto`，保证清单资源地址使用 HTTPS
- 关联文件: android/utils/updateService.js, android/App.vue, android/utils/appConfig.js, server/README.md, android/Doc/APP打包说明.md, AI_TOOL/android_update_service_test.mjs
- 标签: android, WGT, App-Plus, 自动更新, HTTPS, reverse-proxy
- 关键词: update.json, plus.runtime.install, tv.xiaohuihuitop.top, update directory

## [2026-09-01] 事实: WGT 已生成但线上升级目录尚未发布
- 触发条件: 需要用旧版 APK 验证 `tv.xiaohuihuitop.top` 的自动更新
- 已验证: HBuilderX 5.07 生成 `android/unpackage/release/wgt/ai-tv-1.0.1.wgt`，大小 306509 字节，WGT manifest 为版本 `1.0.1 / 101` 且不含 `adid`；全部 Android Node 回归、Python compileall 和 git diff check 通过
- 线上状态: `https://tv.xiaohuihuitop.top/` 返回 302，`/update/update.json` 返回 404，尚未完成静态目录反代和清单发布
- APK 状态: 同日生成的 APK 资源 manifest 含 DCloud 云端注入的 `adid: 122993130201`，源码和 WGT 未配置该值；无广告 APK 必须先清空云端广告 AppID 后重新打包
- 预防/规则: 先上传 WGT，再发布 update.json；发布清单的 `size_bytes` 必须与实际文件大小一致；本地构建成功不等于线上自动更新成功
- 关联文件: android/manifest.json, android/unpackage/release/wgt/ai-tv-1.0.1.wgt, android/Doc/APP打包说明.md, server/README.md
- 标签: android, WGT, APK, HBuilderX, DCloud, auto-update, deployment
- 关键词: 1.0.1, 306509, update.json 404, adid

## [2026-09-01] 根因: 反代 HTTPS 下 public 资源地址仍为 HTTP
- 现象: `https://tv.xiaohuihuitop.top/public/index.json` 返回的视频、封面和文档 URL 使用 `http://`
- 根因: `server/app/api/public_routes.py` 直接使用 `request.base_url`，当前 Uvicorn 启动方式没有自动信任 `X-Forwarded-Proto`
- 修复: 公共清单基址计算读取首个合法的 `X-Forwarded-Proto`，Host 继续使用反代传入的 Host；新增 `test_public_index_uses_forwarded_https_origin`
- 验证: 本地服务端管理/可靠性回归以及 Android Node、Python compileall、git diff check 通过；公网仍是旧镜像，需部署后复核
- 预防/规则: 反代必须传递 `Host`、`X-Forwarded-For` 和 `X-Forwarded-Proto`；代码修复完成不等于线上镜像已更新
- 关联文件: server/app/api/public_routes.py, AI_TOOL/server_admin_features_test.py, server/README.md
- 标签: server, reverse-proxy, HTTPS, public-index, deployment
- 关键词: X-Forwarded-Proto, request.base_url, http resource URL

## [2026-09-12] 根因: 视频 Range 分段响应缺少媒体类型导致浏览器预览失败
- 现象: 后台“手机预览”加载真实 MP4 后显示“无法播放”，即使无 Range 的下载响应已带 `Content-Type: video/mp4`。
- 根因: 浏览器播放器会发起 `Range` 请求；服务端的 `StreamingResponse` 仅返回 `Content-Range`、`Accept-Ranges` 和 `Content-Length`，未指定 `media_type`，206 响应因此缺失 `Content-Type`。
- 修复: API 和 public 两个视频下载接口的 FileResponse 与 StreamingResponse 均显式声明 `video/mp4`；回归测试同时断言两个接口的 206 状态、范围头、媒体类型和分段正文。
- 预防/规则: 任何支持 Range 的媒体接口都必须验证无 Range 的 200 和 Range 的 206 响应具有一致且正确的媒体类型，不能仅测试下载成功或范围字节。
- 关联文件: server/app/api/routes.py, server/app/api/public_routes.py, AI_TOOL/server_admin_features_test.py
- 标签: server, video, range, streaming, content-type, browser
- 关键词: StreamingResponse, Range, 206, video/mp4, Content-Type

## [2026-09-14] 现象: 后台手机预览与客户端真机比例和按钮布局不一致
- 触发条件: 后台预览同时为竖屏模型固定 `width`、`height` 和 `aspect-ratio`，横屏模型又继承竖屏的 `max-width`；窄窗口中的三枚中文按钮保留默认水平内边距。
- 根因: `aspect-ratio` 不能在宽高均已确定时重新约束盒子尺寸；横屏覆盖宽度后未覆盖竖屏最大宽度；按钮可用宽度不足时文本换行。
- 解决步骤: 竖屏模型改为由受视口限制的高度推导宽度，保持 `9:20`；横屏显式覆盖最大宽度并保持 `20:9`；底部按钮改为固定单行、紧凑内边距；加入自定义播放、时间与进度控件，使用本地可播放横竖屏素材做浏览器验收。
- 预防/规则: 手机模型必须只确定一个尺寸再由 `aspect-ratio` 推导另一个尺寸；变体样式要显式覆盖基础尺寸限制；应以真机截图比例和实际可播放视频做视觉验收，不能只检查 CSS 字符串或文字说明。
- 关联文件: server/app/static/app.css, server/app/static/mobile-preview.js, server/app/templates/videos.html, AI_TOOL/server_admin_features_test.py
- 标签: server, web, video, preview, responsive, css, visual-test
- 关键词: aspect-ratio, max-width, 20:9, 9:20, mobile preview, contain

## [2026-09-15] 根因: 正式后台不能只用数据库宽高决定手机客户端播放方向
- 现象: `VID_20250930_210507.mp4` 的数据库记录为 `1920 x 1080`，但手机客户端最终按竖屏显示；后台若直接比较 `width > height` 会展示错误的横屏模型。
- 根因: 原始视频流宽高、旋转元数据、封面最终尺寸和客户端实际渲染方向可能不一致；后台只读取数据库记录无法代表最终播放效果。
- 解决步骤: 预览按钮传入受保护的封面地址；前端优先读取 `Image.naturalWidth/naturalHeight`，封面不可用时读取已加载视频的 `videoWidth/videoHeight`，最后回退数据库宽高。模型只在固定 `9:20` 与 `20:9` 两种尺寸间切换，视频使用 `object-fit: contain`。
- 版本规则: `Settings.app_version` 作为唯一运行时来源；Dockerfile 用 `ARG APP_VERSION` 写入 OCI label 和 `ENV`，GitHub Actions 用 `github.ref_name` 传入构建 tag；运行镜像仍固定为 `ai_tv_server:latest`，不改变部署命令。
- 预防/规则: 视觉预览必须以客户端最终可见的封面或视频显示尺寸为方向依据；固定手机模型时只允许小窗口按可用空间等比例缩放，不随素材宽高改变模型比例；部署后需检查后台版本号和实际视频播放。
- 关联文件: server/app/templates/videos.html, server/app/static/mobile-preview.js, server/app/static/app.css, server/app/core/config.py, server/app/services/system_status.py, server/Dockerfile, .github/workflows/server-image-build.yml, AI_TOOL/server_admin_features_test.py
- 标签: server, web, video, preview, orientation, docker, version
- 关键词: cover orientation, naturalWidth, videoWidth, APP_VERSION, github.ref_name, 20:9, 9:20

## [2026-09-27] 现象: 服务端视频传输、上传和任务轮询存在持续资源放大
- 触发条件: 大文件 Range 播放、多请求并发上传、历史视频表增长，或上传后的后台标签页长期打开。
- 根因: Range 默认 8 KiB 导致大量 Python 迭代；上传逐块查询磁盘且请求之间没有共享容量预算；worker 的 `status` 查询无复合索引；后台轮询不会在任务完成或页面隐藏时可靠停止，也可能产生重叠请求。
- 解决步骤: Range 块调整为 256 KiB；SQLite v2 迁移增加 `videos(status, id)`；同一文件系统按未落盘字节做进程级预留，并在受锁保护的写入后转为真实占用；任务轮询合并进行中请求、跟随页面可见性并在归零时移除 `watch`。
- 预防/规则: 容量预留不能与已落盘空间重复计算，也不能只看单个请求；高频轮询必须有停止条件、可见性控制和 in-flight 合并；索引变更必须验证旧库带数据迁移。
- 关联文件: server/app/services/range.py, server/app/services/uploads.py, server/app/db/models.py, server/app/db/session.py, server/app/static/video-tasks.js, AI_TOOL/server_reliability_test.py, AI_TOOL/server_admin_features_test.py
- 标签: server, performance, streaming, upload, sqlite, polling
- 关键词: 256 KiB, reservation, unpersisted bytes, status index, visibilitychange, in-flight

## [2026-09-27] 现象: Android 下载和清单刷新造成同步写入、后台轮询与缓存穿透
- 触发条件: 大视频下载产生高频进度事件、下载后立即播放、失败记录留在离线页、频繁切页或慢网下修改服务器地址。
- 根因: 每个进度事件都同步读写完整下载列表并刷新响应式数组；隐藏页面可被回调重新启动轮询；failed 被当作进行中；清单和封面每次 onShow 都追加时间戳；并发清单请求没有按 URL 和请求代次隔离。
- 解决步骤: 下载持久化和 UI 回调按 5% 节流；轮询只处理 downloading 且受页面可见性控制；图片启用懒加载，只有实际加载失败或下拉刷新才更新 URL；同 URL 请求合并，不同 URL 用代次丢弃旧响应；WGT 安装前复查播放状态并清除被阻断检查的冷却时间。
- 预防/规则: 原生高频事件不能直接触发同步存储和全表渲染；页面生命周期结束后回调不得重新启动定时器；缓存绕过必须由明确的失败或用户刷新触发；异步响应应用前必须验证仍属于当前配置。
- 关联文件: android/utils/offlineService.js, android/pages/latest/index.vue, android/pages/offline/index.vue, android/utils/updateService.js, AI_TOOL/offline_download_race_test.mjs, AI_TOOL/android_performance_test.mjs, AI_TOOL/android_update_service_test.mjs
- 标签: android, performance, download, storage, cache, lifecycle, race
- 关键词: progress throttle, setStorageSync, pageVisible, lazy-load, request sequence, WGT playback guard

## [2026-10-03] 根因: 手机预览空错误层覆盖视频区导致后台无法点击播放
- 现象: build-v1.12 部署后，后台"手机预览"画面被暗色遮罩覆盖，点击"播放"无任何反应，被误判为服务端视频接口故障。
- 根因: videos.html 的空错误段落带 `hidden` 属性，但 app.css 的 `.mobile-preview-error` 作者样式设置 `display: grid`，优先级高于浏览器默认 `[hidden] { display: none }`，导致遮罩（inset:0、z-index:2、pointer-events:auto、72% 黑色背景）始终渲染并吞掉视频区全部点击；视频元素本身加载正常（readyState 4、元数据和 206 响应均正确）。
- 修复: 补充 `.mobile-preview-error[hidden] { display: none; }`，与既有 `.upload-progress[hidden]` 模式一致；回归断言加入 server_admin_features_test.py。已在生产页面注入该规则实测：elementFromPoint 命中播放按钮、点击后播放进度正常推进。
- 预防/规则: 带 `hidden` 属性的元素若类样式设置了 display，必须同时提供 `[hidden]` 覆盖规则；预览类 UI 故障要用真实浏览器点击命中（elementFromPoint）验证，不能只测 HTTP 接口；排查播放问题应先区分"接口故障"与"界面遮挡"。
- 关联文件: server/app/static/app.css, server/app/templates/videos.html, AI_TOOL/server_admin_features_test.py
- 标签: server, web, preview, css, hidden, click-through, playback
- 关键词: hidden attribute, display grid, elementFromPoint, mobile-preview-error, play button blocked

## [2026-10-03] 现象: v1.13 已部署但后台仍显示旧样式，播放修复未生效
- 触发条件: 服务端静态文件仅带 ETag/Last-Modified，无 Cache-Control；旧文件距首次发布时间越长，浏览器启发式缓存免验证窗口越长，普通刷新不重新拉取。
- 根因: 浏览器对 /static/app.css 使用启发式强缓存，部署新镜像后页面仍加载旧 CSS，隐藏错误层的修复对客户端不可见；用真实浏览器检查 document.styleSheets 证实加载的样式表缺少新规则。
- 解决步骤: 新增 StaticCacheMiddleware 对 /static 响应统一设置 `Cache-Control: no-cache`（配合既有 ETag 走 304 协商缓存）；现场用带时间戳查询参数重载样式表验证修复立即生效，播放恢复。
- 预防/规则: 服务端静态资源必须显式声明缓存策略，不能依赖浏览器启发式缓存；"已部署但页面行为未变"首先核对浏览器实际加载的资源版本（styleSheets/网络面板），再怀疑代码。
- 关联文件: server/app/main.py, server/app/core/static_cache.py, AI_TOOL/server_admin_features_test.py
- 标签: server, web, cache, deployment, static, css
- 关键词: Cache-Control, no-cache, heuristic caching, ETag, stale stylesheet

## [2026-10-03] 根因: 云打包 APK 缺少 VideoPlayer 模块导致手机 App 无法播放任何视频
- 现象: 手机 App 打开视频后播放器页面黑屏，弹出 HTML5+ Runtime 提示"打包时未添加 videoplayer 模块"；服务端所有接口实测正常，WGT 热更新无效。
- 根因: android/manifest.json 的 `app-plus.modules` 与 `permissions` 均为空，云打包产物不含 DCloud VideoPlayer 原生模块，而播放页使用 `<video>` 组件和 `uni.createVideoContext`；该配置使所有历史云打包 APK 都无法播放视频，且原生模块缺失只能重装 APK 修复。
- 解决步骤: 在 manifest.json 声明 `"VideoPlayer": {}`；新增 AI_TOOL/android_packaging_test.mjs 断言（旧配置失败、新配置通过）；用 HBuilderX CLI 将项目以标准基座（自带模块）运行进 MuMu 模拟器，App 成功加载清单并真实播放视频（画面、进度推进、206 流式响应均确认）。
- 预防/规则: uni-app App 端新增原生能力组件（video/map/live-push 等）时必须同步声明对应 modules，云打包后必须在真机/模拟器实测该能力；"服务端正常但 App 功能失效"优先检查云打包模块配置；涉及原生模块的缺陷不能只发 WGT。
- 关联文件: android/manifest.json, android/pages/player/index.vue, AI_TOOL/android_packaging_test.mjs
- 标签: android, uni-app, cloud-pack, VideoPlayer, manifest, emulator
- 关键词: videoplayer 模块, app-plus.modules, 标准基座, HBuilderX cli, MuMu, 黑屏

## [2026-10-03] 事实: 标准基座验收不等于云打包 APK 发布验收
- 触发条件: 使用 HBuilderX 标准基座在 MuMu 验证视频播放、下载、离线播放、设置和断网恢复。
- 已验证: 标准基座连接 WSL 本地服务后，在线图文、横竖屏播放、重播、下载/离线本地播放/删除、设置弹窗和断网后重试均通过；清理 logcat 后未发现 `FATAL EXCEPTION`、`AndroidRuntime` 或 HBuilder 应用错误。
- 边界: 标准基座预置 VideoPlayer 等原生模块，能验证页面 JavaScript 和运行时行为，但无法证明最终云打包 APK 已包含正确模块，也无法覆盖实体设备、生产域名 DNS 或 WGT 发布链路。
- 预防/规则: 对原生模块、权限或 manifest 有变更时，验收至少分为“标准基座功能回归”与“重新云打包 APK + 实体设备验收”两层；报告结果时必须明确测试包类型和服务地址。
- 关联文件: android/manifest.json, android/pages/player/index.vue, AI_TOOL/android_packaging_test.mjs, docs/project/进度.md
- 标签: android, emulator, HBuilderX, cloud-pack, acceptance, VideoPlayer
- 关键词: 标准基座, 云打包, APK, MuMu, VideoPlayer, 验收边界

## [2026-10-03] 根因: 最新页无视频由本地地址与服务生命周期造成
- 触发条件: Android 设置中已持久化 `http://127.0.0.1:8000/public/index.json?...`，上一轮验收完成后 WSL 本地 uvicorn 被停止。
- 根因: 模拟器中的 `127.0.0.1` 依赖 ADB `reverse tcp:8000 tcp:8000` 映射到开发机端口；服务停止或映射不可用时，客户端无法读取清单。旧页面将认证/网络/格式/空列表混淆，用户容易误判为服务端没有视频。
- 解决步骤: 恢复 WSL API 并确认本地清单返回 2 个 ready 视频与 1 篇图文；清单状态层严格验证 `{ items: [] }`，401/403 明确报认证错误，网络失败使用合法缓存并标注缓存来源；设置页展示地址时掩码 `user`/`pass`。
- 预防/规则: 本地开发地址与公网默认地址必须在界面上可区分；结束本地验收前应明确服务是否继续运行；模拟器访问 WSL 要同时验证 uvicorn、ADB reverse 和清单响应。不要把网络、认证和格式错误显示为“暂无数据”。
- 关联文件: android/pages/latest/index.vue, android/utils/indexState.js, android/utils/indexService.js, android/pages/settings/index.vue, android/utils/appConfig.js, AI_TOOL/android_latest_state_test.mjs
- 标签: android, muMu, wsl, index, cache, diagnostics
- 关键词: 127.0.0.1, adb reverse, uvicorn, index_cache, 401, empty state

## [2026-10-03] 事实: App-Plus 标准基座不保证 URL API 与原生输入自动化兼容
- 触发条件: 设置页用 `new URL()` 处理清单地址，标准基座运行时产生回退并直接展示 query 凭据；测试环境尝试通过 WebView DOM 自动化输入原生封装的 `<input>`。
- 根因: App-Plus 标准基座的页面 WebView 与 Node/现代浏览器能力并不完全等价；`URL` 可用性和输入元素 DOM 暴露方式不能作为通用前提。
- 解决步骤: 地址校验和凭据掩码改为不依赖 `URL` 全局对象的正则/字符串处理；设备实测确认掩码生效。对无法可靠注入的原生输入控件，不把自动化注入结果作为产品验收结论。
- 预防/规则: uni-app App-Plus 的配置解析使用轻量、兼容的字符串逻辑，并通过真实基座或 APK 复验；浏览器 DOM 自动化仅能覆盖其实际暴露的页面层，原生控件保留人工/设备专项测试。
- 关联文件: android/utils/appConfig.js, android/pages/settings/index.vue, AI_TOOL/android_ui_cleanup_test.mjs
- 标签: android, uni-app, app-plus, compatibility, URL, input
- 关键词: URL, regex, standard playground, native input, credential mask

## [2026-10-03] 事实: App 范围决策——不做无障碍支持、默认 admin/admin 凭据维持现状
- 触发条件: 第二轮复查将"默认 query 凭据同时可访问管理后台"与"封面 URL 经无障碍（TalkBack）通道朗读出凭据"列为遗留待办，用户逐项决策。
- 已确认: 用户实测知悉 admin/admin 可访问管理后台（本地服务实测 200）；App 仅家庭内部使用、由用户本人维护、内容不对外分发，该风险被明确接受。App 不需要无障碍操作。
- 处理: 默认凭据维持现状不改认证协议；删除自有代码中的无障碍语义（最新页 `role="tablist"`、全局 `prefers-reduced-motion` 减弱动画查询），第三方 `uni_modules/mp-html` 不动；`android_ui_cleanup_test.mjs` 以"不再包含 role/aria/prefers-reduced-motion"断言固化该决策。
- 边界/规则: 后续 AI 或人工审查不得再默认将无障碍语义、默认凭据列为待办或擅自加回相关属性；仅当使用场景变化（对外分发、出现视障用户）时需重新评估。适老化（大字体、高对比、大按钮）属于普通 UI 需求，继续保留，不在本决策范围内。
- 关联文件: android/pages/latest/index.vue, android/App.vue, AI_TOOL/android_ui_cleanup_test.mjs, docs/project/需求.md
- 标签: android, scope, decision, accessibility, credentials
- 关键词: 无障碍, TalkBack, role, aria, prefers-reduced-motion, admin/admin, scope decision

## [2026-10-03] 根因: 清单缓存全局单键导致切换服务器后串用旧内容
- 触发条件: 服务器 A 成功加载清单后写入缓存，切换到不可达的服务器 B 再打开最新页。
- 根因: `index_cache` 是与地址无关的全局键，`resolveIndexLoadState` 对任何网络失败都接受"结构合法"的缓存，不校验缓存来自哪个服务器；缓存条目资源 URL 还携带旧服务器的 query 凭据，跨服务器展示并继续访问旧地址。
- 解决步骤: 缓存改为 `{ sourceUrl, data }` 信封并新增 `resolveCachedManifest`，仅当缓存来源与当前标准化请求地址完全一致时回退；页面用 `renderedSourceUrl` 追踪当前渲染来源，切换地址后先清空旧列表；401/403 只清除当前来源的缓存。旧裸清单缓存属一次性破坏，直接丢弃（内容可重新拉取）。
- 预防/规则: 任何"按当前配置渲染的持久化数据"必须绑定配置来源；缓存回退类功能要区分"同源断网"与"异源不可达"，并先用双服务器场景复现再修复。
- 关联文件: android/utils/indexState.js, android/pages/latest/index.vue, AI_TOOL/android_latest_state_test.mjs
- 标签: android, cache, multi-server, isolation, index
- 关键词: index_cache, sourceUrl, cache envelope, stale content, resolveCachedManifest

## [2026-10-03] 根因: 离线下载仅用服务端自增 ID 识别导致跨服务器串内容
- 触发条件: 在服务器 A 下载视频 ID 1 后，切换到服务器 B（其视频 ID 1 是另一个文件），最新页把 B 的视频标记为"已下载"并可播放 A 的本地文件；重复下载同 ID 还会覆盖记录并留下孤儿文件。
- 根因: `download_items` 状态映射、本地路径合并、删除和播放队列全部以 `String(entry.id)` 为键，而每台服务器的数字 ID 都从 1 重新编号；下载中条目可删除但不取消任务，文件删除失败被吞掉后元数据先被删除。
- 解决步骤: 新增 `buildDownloadIdentity`（type + id + 资源 URL，剔除 `user`/`pass`/`_t` 等易变查询参数，兼容同服务器密码轮换）；状态映射、合并、删除、队列全部改用身份键；下载中禁止删除、中断下载重启后标记失败允许重试、删除按先封面后视频顺序执行且失败时保留记录并回写已删字段；损坏 `download_items` 自动清除。
- 预防/规则: 客户端本地记录不能假设服务端 ID 全局唯一，身份至少包含来源资源地址；文件删除与元数据删除必须同成败，禁止吞错后继续删元数据；涉及下载状态机时必须覆盖"并发、中断重启、跨服务器同 ID"三类场景。
- 关联文件: android/utils/offlineService.js, android/utils/indexService.js, android/pages/offline/index.vue, android/pages/latest/index.vue, AI_TOOL/android_offline_integrity_test.mjs
- 标签: android, offline, download, identity, multi-server

## [2026-10-03] 现象: 后台相册只有目录，无法直接浏览图片
- 触发条件: 相册上传和列表已经可用，但点击相册只能停留在目录页，管理员需要逐张查看并切换照片。
- 根因: 后台仅实现 `/web/albums` 列表和缩略图接口，没有相册详情路由、当前照片位置和相邻照片导航。
- 解决步骤: 新增 `/web/albums/{album_id}` 详情页，以 `photo_id` 查询参数定位当前照片；服务层按 `position/id` 排序生成当前、上一张和下一张数据；详情页下方固定渲染“上一张 / 返回 / 下一张”，首尾状态禁用；图片只使用 `photo_thumbs` 展示图。
- 预防/规则: 相册目录和照片浏览应分离；浏览控制必须在首张/末张验证禁用状态，非法相册照片 ID 返回 404；后台页面不要直接输出原图文件路径。
- 关联文件: server/app/web/routes.py, server/app/templates/albums.html, server/app/templates/album_detail.html, server/app/static/app.css, AI_TOOL/server_admin_features_test.py
- 标签: server, web, photo, album, navigation
- 关键词: album detail, previous, next, photo_id, thumbnail, gallery

## [2026-10-03] 现象: 模拟器看不到相册图片导航按钮
- 触发条件: 用户在 Android 模拟器打开“最新 → 照片 → 相册”后看不到“上一张 / 返回 / 下一张”，但服务端后台相册详情页已经有同名按钮。
- 根因: 两个验收入口属于不同实现层：服务端 `/web/albums/{album_id}` 与 Android `/pages/photos/index` 完全独立；先前只修改后台页面，未修改 App 查看页。
- 解决步骤: 在 Android 照片页增加 `hasPrev`/`hasNext`、上一张/返回/下一张按钮和 `uni.navigateBack()`；按钮与 `swiper` 共用 `currentIndex`，新增 `updatePhotoIndex` 只持久化索引；通过 HBuilderX CLI 重新同步标准基座，并检查设备端 `app-service.js` 包含按钮源码。
- 预防/规则: 用户说“模拟器没看到效果”时，先确认实际验收入口和设备端 bundle，再在对应实现层修复；后台 DOM 通过不能替代 App 页面验收。
- 关联文件: android/pages/photos/index.vue, android/utils/photoQueue.js, AI_TOOL/android_ui_cleanup_test.mjs, AI_TOOL/android_photo_queue_test.mjs, docs/project/进度.md
- 标签: android, photo, gallery, emulator, implementation-layer, bundle
- 关键词: pages/photos, album-actions, updatePhotoIndex, HBuilderX, MuMu, implementation mismatch

## [2026-10-04] 现象: 相册后台图片管理不方便
- 触发条件: 后台相册只能进入单张预览和删除整本相册，无法编辑相册信息、选择封面或整理图片顺序。
- 根因: `PhotoAlbum` 只有标题，封面隐式取排序第一张；详情页只渲染当前照片，`Photo.position` 虽已存在但没有管理接口和 UI。
- 解决步骤: 增加相册描述与独立 `cover_photo_id` 字段及 SQLite v3 迁移；统一按 `position/id` 排序和有效封面回退；新增元数据、封面、顺序保存路由；详情页改为展示图网格，支持拖拽/上移/下移、封面选择、名称/描述编辑和大图预览；public/API 同步新字段和顺序。
- 预防/规则: 封面必须与顺序解耦；重排请求必须验证当前相册完整 ID 集合、无重复和无跨相册 ID，再连续编号提交；旧数据库新增列必须有版本迁移和旧数据回填；后台优先使用受控展示图而不是原图。
- 关联文件: server/app/db/models.py, server/app/db/session.py, server/app/db/repo.py, server/app/services/uploads.py, server/app/api/routes.py, server/app/api/public_routes.py, server/app/web/routes.py, server/app/templates/albums.html, server/app/templates/album_detail.html, server/app/static/app.css, AI_TOOL/server_admin_features_test.py, AI_TOOL/server_reliability_test.py
- 标签: server, web, photo, album, metadata, cover, reorder, migration
- 关键词: cover_photo_id, description, Photo.position, album-photo-grid, reorder, schema migration

## [2026-10-04] 现象: 新代码已修改但后台详情页仍返回 500
- 触发条件: 8000 端口仍由早先启动的非热重载 uvicorn 进程提供，源码和数据库迁移已更新，但运行进程未加载新路由/模板。
- 根因: 本地服务生命周期与代码工作树脱节；旧进程使用旧 ORM 模型，列表页可用但详情页访问新字段时失败。
- 解决步骤: 核对进程启动时间、工作目录、`DATA_DIR/DB_PATH`；停止旧进程并用当前代码、同一数据目录重启；确认 `schema_migrations` 已到 v3、详情接口 200 后再进行浏览器验收。
- 预防/规则: 服务端页面验收前必须同时确认运行进程已加载当前代码和数据库迁移版本；非热重载 uvicorn 修改后必须显式重启，不能只看源码或静态测试。
- 关联文件: server/app/db/session.py, server/app/web/routes.py, docs/project/进度.md
- 标签: server, deployment, uvicorn, migration, verification
- 关键词: stale process, non-reload, schema_migrations, detail 500, DATA_DIR, DB_PATH
