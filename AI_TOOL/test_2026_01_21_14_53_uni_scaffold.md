# uniapp 基础结构测试脚本说明

## 用途
验证 `frontend/pages.json` 是否存在并包含 3 个 Tab 页面定义。

## 使用方法
在项目根目录执行：

```powershell
node AI_TOOL/test_2026_01_21_14_53_uni_scaffold.js
```

## 预期结果
- 若缺少 `pages.json` 或页面定义不完整，脚本返回非 0 并输出失败原因。
- 正常情况下输出 `ok`。
