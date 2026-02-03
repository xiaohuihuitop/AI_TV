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
