---
title: 配置校验
---

# 配置校验

Sharkable 在启动时自动校验关键配置，以清晰的错误信息快速失败，防止运行时意外。

## 校验内容

校验器在 `AddShark()` 结束时运行：

| 检查项 | 条件 | 错误信息 |
|---|---|---|
| JWT audiences | 调用 `ConfigureJwt()` 且设置了 audiences 时，至少需要一个 audience | `JwtAudiences: at least one audience is required` |
| JWT authority | 调用 `ConfigureJwt()` 时，`authority` 不能为 null/空 | `JwtAuthority: authority is required` |
| 多租户解析器 | 调用 `ConfigureMultiTenant()` 时，`ResolveTenant` 委托必须设置 | `TenantOptions.ResolveTenant: must be configured` |

## 失败行为

收集全部校验错误后，若存在任何失败项，在应用启动前抛出 `SharkConfigurationException`：

```
Sharkable.SharkConfigurationException: Configuration validation failed:
  - JwtAudiences: at least one audience is required
  - TenantOptions.ResolveTenant: must be configured
```

## 退出

配置校验不能关闭。它的设计目标是在启动时（而非运行时）捕获错误配置。如果某条规则对你的场景过于严格，请传入合法（即使是占位）的值，或提交 Issue。
