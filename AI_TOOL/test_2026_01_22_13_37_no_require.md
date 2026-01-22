# 页面 require 检查脚本说明

## 用途
确保页面脚本不使用 `require`，避免 App 运行时白屏。

## 使用方法
在项目根目录执行：

```powershell
node AI_TOOL/test_2026_01_22_13_37_no_require.js
```

## 预期结果
- 正常输出 `ok`。
- 若页面包含 `require`，脚本返回非 0 并输出对应文件路径。
