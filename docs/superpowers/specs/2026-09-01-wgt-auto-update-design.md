# APK + WGT 自动更新设计

## 目标

让长辈打开 App 时自动获得最新的页面和业务代码，不依赖 GitHub，不需要手动安装每次 WGT。APK 继续负责原生能力和权限；WGT 负责页面、JavaScript、CSS 与业务逻辑更新。

## 范围

本次设计包含：

- 使用 `tv.xiaohuihuitop.top` 作为管理、清单和 WGT 更新的统一 HTTPS 域名。
- 客户端在 App-Plus 环境读取当前 WGT 版本，检查远端 `update.json`。
- 发现更高版本后后台下载 WGT，下载完成后安装并重启到最新页面资源。
- 更新过程不显示复杂操作，不覆盖当前版本，不在视频播放页主动重启。
- 补充反向代理、升级目录、`update.json` 格式和发布步骤文档。

不包含：

- APK 自动更新。涉及原生权限、原生插件、图标或 manifest 的变化时仍需重新安装 APK。
- PWA、GitHub Release 作为手机客户端更新源、数据库迁移。
- 视频自动缓存或下载限速。

## 域名与部署架构

现有 FastAPI 容器继续监听容器内 `8000`，反向代理对外提供 HTTPS：

```text
https://tv.xiaohuihuitop.top/
        |
        +-- /web/    -> http://127.0.0.1:8000/web/
        +-- /api/    -> http://127.0.0.1:8000/api/
        +-- /public/ -> http://127.0.0.1:8000/public/
        +-- /       -> http://127.0.0.1:8000/
        +-- /update/ -> 静态升级目录
```

部署约束：

- DNS 的 A/AAAA 记录指向服务器公网地址，反代监听 `80/443` 并负责 HTTPS 证书。
- 反代必须传递 `Host`、`X-Forwarded-For` 和 `X-Forwarded-Proto`，使服务端清单生成 `https` 资源地址。
- Docker 的 `8000` 只供本机反代访问时绑定为 `127.0.0.1:8000:8000`；如果反代在其他容器，则使用对应内部网络地址。
- `/update/` 使用独立持久化目录，例如 `/srv/ai_tv_updates`，不放入 Docker 镜像层。发布 WGT 不需要重建服务端镜像。

最终入口示例：

```text
https://tv.xiaohuihuitop.top/web/videos
https://tv.xiaohuihuitop.top/public/index.json
https://tv.xiaohuihuitop.top/update/update.json
```

## 更新清单格式

`update.json` 使用固定字段，版本号采用三段式数字 `major.minor.patch`，只接受严格高于当前版本的更新：

```json
{
  "version": "1.0.1",
  "version_code": 101,
  "wgt_url": "https://tv.xiaohuihuitop.top/update/ai-tv-1.0.1.wgt",
  "size_bytes": 1234567
}
```

规则：

- `version` 必填且必须符合 `数字.数字.数字`；版本相同或更低时不更新。
- `version_code` 用于日志和人工核对，不作为唯一比较依据。
- `wgt_url` 必须是 HTTPS 绝对地址，并且只允许下载 WGT 文件。
- `size_bytes` 存在时，客户端用本地文件信息确认下载大小；不匹配直接删除临时文件，不安装。
- 传输完整性和来源由 HTTPS 证书保障；可另外发布 SHA-256 文件供服务器管理员人工核对，但不在客户端临时引入第三方摘要实现。

发布顺序：先上传 WGT，再上传或替换 `update.json`。这样客户端不会先看到一个尚未可下载的版本。

## 客户端流程

在 `App.vue` 的 App-Plus 生命周期中调用独立更新服务：

1. `onLaunch` 延迟执行一次检查，避免遮挡启动首屏。
2. `onShow` 只在距离上次检查超过冷却时间时检查，避免页面切换反复请求。
3. 读取 `plus.runtime.getProperty` 得到当前 WGT 版本。
4. 请求固定地址 `https://tv.xiaohuihuitop.top/update/update.json`。
5. 校验 JSON、HTTPS 地址和版本号；没有更高版本立即结束。
6. 使用 `uni.downloadFile` 下载到临时文件；声明了文件大小时通过 `uni.getFileInfo` 校验下载结果。
7. 下载和校验成功后调用 `plus.runtime.install(..., { force: false })`。App-Plus 会校验 WGT 的 AppID 与版本，不允许同版或降级安装；安装完成再调用 `plus.runtime.restart`。
8. 更新状态只写入本地日志键，不向用户展示失败重试按钮；下次启动自动再次检查。

更新服务保持纯 JavaScript，并通过依赖注入接收运行时、网络、文件和时间适配器，便于 Node 回归测试。非 App-Plus 环境直接跳过，不影响 H5 预览和开发工具运行。

## 播放保护与错误处理

- 播放页进入时设置更新服务为忙碌状态；退出播放页后恢复可更新状态。
- 下载过程中不替换当前运行资源；只有完整下载、校验和安装成功后才重启。
- `update.json` 请求失败、网络超时、HTTP 非 2xx、WGT 下载失败、文件大小不匹配或安装失败，均保留当前版本并记录原因。
- 不自动降级、不覆盖低版本、不删除当前可运行资源。
- 同一版本只允许一个更新任务，避免并发下载和重复重启。

## 验证方案

自动验证：

- 版本比较覆盖相等、低版本、高版本和非法版本。
- 清单校验覆盖缺字段、非 HTTPS、错误扩展名和错误大小。
- 更新任务覆盖非 App-Plus 跳过、冷却时间、播放保护、重复任务和失败清理。
- `git diff --check`、现有 Android Node 回归脚本和 Python 编译检查。

人工验证：

- 在手机或模拟器中从旧版本启动，确认后台完成 WGT 安装并重启到新页面。
- 断网或删除 WGT 时确认 App 仍能进入旧版本。
- 播放视频时切换前后台，确认不会在播放过程中自动重启。
- 通过 `tv.xiaohuihuitop.top` 检查管理页、清单、视频 Range 播放和升级文件均可访问，并确认清单返回的资源 URL 使用 HTTPS。

## 风险与限制

- WGT 不能修改 Android 原生权限、原生插件、图标、包名或 manifest；这些变化仍需 APK 发布。
- WGT 自动安装通常会触发 App 重启，因此只在启动或非播放场景执行。
- 当前服务端 public 清单协议会按既有兼容方式携带查询认证参数；本次不扩大该协议范围。
- HTTPS 证书、反代配置和升级目录权限属于服务器部署责任，代码测试无法替代线上验证。
