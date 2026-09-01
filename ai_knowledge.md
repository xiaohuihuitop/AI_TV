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
