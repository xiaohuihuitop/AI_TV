# 测试说明：Markdown 插件 ESM 导出

## 用途
校验 mp-html 的 Markdown 插件使用 ESM 导出，避免默认导入失败导致编译错误。

## 使用方法
在项目根目录执行：

```bash
node AI_TOOL/test_2026_01_22_21_29_markdown_plugin_export.js
```

## 预期结果
输出 `ok` 表示通过；失败会提示缺失的 ESM 导出或仍存在 CommonJS 语法。