# App 打包说明

## 打包目标
- Android 包名：`com.xhhtop.aitv`
- 默认清单和 WGT 更新域名：`https://tv.xiaohuihuitop.top`
- 服务端容器内部仍使用 HTTP `8000`，但手机客户端默认通过 HTTPS 域名访问。

## 打包前检查
1. `android/manifest.json` 中不要配置 `adid`。
2. HBuilderX 发行 Android 安装包时，不要勾选“快捷开屏广告”“悬浮红包广告”“激励视频广告”或任何 uni-AD/广告相关选项。
3. 如果 APK 右下角出现广告，重点检查 DCloud 开发者后台或 HBuilderX 云打包页中当前 AppID 是否绑定了广告 AppID。仅命令行传 `--rpads false` 不一定能覆盖账号云端保存的广告配置。
4. App 内置默认地址使用 HTTPS。用户手动填写没有协议的旧地址时，App 仍会按既有兼容规则补 `http://`。

## 推荐命令
在本机可用 HBuilderX CLI 时，优先使用配置文件打包，并显式关闭广告：

```powershell
D:\Application\HBuilderX\cli.exe pack --config C:\Users\xiaohuihui\Desktop\AI_TV\AI_TOOL\android_pack_no_ads.json
```

如使用图形界面打包，需确认广告相关选项全部关闭，否则 APK 内可能出现右下角悬浮广告或开屏广告。

## 验证
打包完成后检查 APK：

```powershell
$apk = "android\unpackage\release\apk\__UNI__F18B1A1__20260506003952.apk"
$tmp = Join-Path $env:TEMP "aitv-apk-check"
Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $tmp | Out-Null
Push-Location $tmp
jar xf "$PWD\..\..\..\$apk" assets/apps/__UNI__F18B1A1/www/manifest.json
Pop-Location
Select-String -Path "$tmp\assets\apps\__UNI__F18B1A1\www\manifest.json" -Pattern '"adid"|129530130201'
```

说明：
- HBuilderX 基座 APK 里可能始终带有 `dcloud_ad_*` 资源文件，不能只靠资源名判断是否会显示广告。
- 真正需要确认的是 `assets/apps/__UNI__F18B1A1/www/manifest.json` 不应包含 `adid`。
- 如果仍有 `adid` 或运行时右下角仍出现广告，需要到 DCloud 开发者后台或 HBuilderX 云打包页面清空广告 AppID，并关闭悬浮红包广告/开屏广告后重新打包。

## WGT 自动更新

App 启动后以及从后台回到前台时，会请求：

```text
https://tv.xiaohuihuitop.top/update/update.json
```

当清单版本高于当前资源版本时，App 会在后台下载 WGT、安装后自动重启。播放页处于前台时不会检查、下载或重启，避免打断视频播放；检查或下载失败会保留当前可用版本，下次启动自动再检查。

更新清单示例：

```json
{
  "version": "1.0.1",
  "version_code": 101,
  "wgt_url": "https://tv.xiaohuihuitop.top/update/ai-tv-1.0.1.wgt",
  "size_bytes": 306509
}
```

发布顺序：

1. 先提高 `android/manifest.json` 的资源版本。
2. 用 HBuilderX 制作与当前 AppID 相同、版本更高的 WGT 资源包。
3. 先上传 WGT 到服务器 `/update/` 静态目录。
4. 确认 WGT 下载正常后，再发布匹配的 `update.json`。

WGT 不能更新 Android 权限、原生插件、图标、包名或其他原生 manifest 配置。这些场景必须重新打包 APK，并让用户手动安装一次。
