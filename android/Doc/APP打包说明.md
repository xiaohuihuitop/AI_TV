# App 打包说明

## 打包目标
- Android 包名：`com.xhhtop.aitv`
- 服务器默认清单：`qh.xhhtop.top:8000/public/index.json?user=admin&pass=admin`
- 当前服务器使用 HTTP，不使用 HTTPS。

## 打包前检查
1. `android/manifest.json` 中不要配置 `adid`。
2. HBuilderX 发行 Android 安装包时，不要勾选“快捷开屏广告”“悬浮红包广告”“激励视频广告”或任何 uni-AD/广告相关选项。
3. 如果 APK 右下角出现广告，重点检查 DCloud 开发者后台或 HBuilderX 云打包页中当前 AppID 是否绑定了广告 AppID。仅命令行传 `--rpads false` 不一定能覆盖账号云端保存的广告配置。
4. 连接地址可以在 App 设置页显示为无协议地址；App 请求清单和下载资源时会自动补 `http://`。

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
