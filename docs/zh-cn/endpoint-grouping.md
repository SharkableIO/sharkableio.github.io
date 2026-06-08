# 端点分组与 OpenAPI 标签

Sharkable 为 `ISharkEndpoint` 端点提供自动分组、OpenAPI 标签和 OperationId 生成。

## 默认分组

每个 `ISharkEndpoint` 类自动成为一个路由组。组名从类名推导（自动移除 `Endpoint`/`Service`/`Controller` 后缀）。

```csharp
public class UserEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("profile", () => "user profile");
    }
}
```

URL：`api/user/profile` — 组名 `user`，标签 `user`。

## 显式分组 `[EndpointGroup]`

多个端点类可以共享相同的 URL 前缀和 OpenAPI 标签。

```csharp
[EndpointGroup("admin")]
public class UserEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("users", () => Results.Ok(users));
    }
}

[EndpointGroup("admin")]
public class RoleEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("roles", () => Results.Ok(roles));
    }
}
```

两者都在 `api/admin/...` 下，共享过滤器和中间件。

## OpenAPI 标签覆盖 `[SharkTag]`

使用显式标签覆盖默认标签（从组名推导）。

```csharp
[SharkTag("admin")]
[SharkTag("management")]
public class UserEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("users", () => Results.Ok(users));
    }
}
```

OpenAPI 标签：`["admin", "management"]`。可重复使用。

## 自动 OperationId

每条路由自动生成 OperationId：`{groupName}_{httpMethod}_{relativePath}`。

```csharp
// 路由：GET /api/test/hello
// OperationId：test_GET_hello

// 路由：POST /api/admin/users
// OperationId：admin_POST_users
```

在 `AddRoutes()` 中手动调用 `.WithOperationId()` 或 `.WithMetadata(new EndpointNameMetadata(...))` 会覆盖自动生成。

## 格式配置

通过 `SharkOption` 配置端点 URL 格式：

```csharp
builder.Services.AddShark(opt =>
{
    opt.Format = EndpointFormat.SnakeCase; // 默认：CamelCase
    opt.ApiPrefix = "api"; // 默认
});
```

| 格式 | 组名 `TestUser` | URL |
|--------|------------------|-----|
| CamelCase（默认） | testUser | `api/testUser/...` |
| SnakeCase | test_user | `api/test_user/...` |
| ToLower | testuser | `api/testuser/...` |
| UnChanged | TestUser | `api/TestUser/...` |

## 旧风格 `[SharkEndpoint]` 端点

基于属性的端点也获得 OpenAPI 标签和 OperationId 支持：

```csharp
[SharkEndpoint]
[SharkTag("catalog")]
public class CatalogEndpoint
{
    [SharkMethod("items/{id}", SharkHttpMethod.GET)]
    public Item? GetItem(int id) { ... }
}
```
