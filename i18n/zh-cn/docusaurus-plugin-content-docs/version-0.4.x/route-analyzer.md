---
title: 路由冲突分析器
---

# 路由冲突分析器

Sharkable 内置 Roslyn 分析器（`SHARK001`），在编译时检测重复的路由注册。安装 NuGet 包后自动生效，无需任何配置。

## 检测内容

如果两个 `ISharkEndpoint` 类在**同一分组**内映射了相同的 HTTP 方法 + 路由，编译时会产生警告：

```
SHARK001: Route conflict: 'api/order/create' is already mapped by 'OrderEndpoint'
```

**可检测的冲突：**
- 同一分组内相同的 HTTP 方法 + 相同路由模板
- `{id:int}` 和 `{id:guid}` 被视为相同路由参数（约束会剥离比较）

**不视为冲突（正确处理）：**
- 不同分组中的相同路由 — 带版本的类如 `OrderV1Endpoint` 和 `OrderV2Endpoint` 产生不同的分组名（`order@1` vs `order@2`）
- 同一路由上的不同 HTTP 方法 — `GET /users/{id}` 和 `DELETE /users/{id}` 没冲突

## 示例

```csharp
public class OrderEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("create", () => "ok");       // api/order/create
    }
}

public class OrderService : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("create", () => "nope");     // SHARK001 ⚠️ api/order/create already mapped by OrderEndpoint
    }
}
```

## 分组名推导

分析器复刻了 Sharkable 的运行时分组名逻辑：
1. 去掉尾部 `Endpoint` / `Service` / `Services` / `Controller` / `Controllers` / `ApiController`（不区分大小写）
2. 将 `V\d+` 后缀转换为 `@\d+`（版本格式）
3. 应用 `CamelCase`

| 类名 | 分组名 |
|------|--------|
| `OrderEndpoint` | `order` |
| `OrderV2Endpoint` | `order@2` |
| `UserApiController` | `user` |
| `PaymentService` | `payment` |

不同分组名的类即使使用相同路由模板也不会冲突。

## 配置严重性

`SHARK001` 诊断默认为 **warning**。通过 `.editorconfig` 修改严重性：

```ini
[*.cs]
dotnet_diagnostic.SHARK001.severity = error   # 冲突时编译失败
```

或关闭：

```ini
dotnet_diagnostic.SHARK001.severity = none
```
