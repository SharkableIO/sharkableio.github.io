# API 版本控制

Sharkable 通过 `[SharkVersion]` 特性支持 API 版本控制，让你可以在不同的 URL 前缀下同时托管多个 API 版本。

## 快速开始

在 `ISharkEndpoint` 类上添加 `[SharkVersion("v1")]`：

```csharp
[SharkVersion("v1")]
public class UserV1Endpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("profile", () => "user profile v1");
    }
}

[SharkVersion("v2")]
public class UserV2Endpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("profile", () => "user profile v2");
    }
}
```

URL 映射：

| 端点 | URL |
|----------|-----|
| `UserV1Endpoint` | `api/v1/user_v1/profile` |
| `UserV2Endpoint` | `api/v2/user_v2/profile` |

## 与 EndpointGroup 配合使用

`[SharkVersion]` 可以与 `[EndpointGroup]` 配合使用：

```csharp
[SharkVersion("v2")]
[EndpointGroup("admin")]
public class AdminV2Endpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("status", () => "admin status v2");
    }
}
```

URL: `api/v2/admin/status`

## 工作原理

- 版本字符串被插入到 URL 前缀中：`{apiPrefix}/{version}/{group}/{route}`
- 版本信息也会包含在自动生成的 OperationId 中以确保唯一性
- 即使不同版本的端点具有相同的 `[EndpointGroup]`，它们也会被分组到不同的路由组
- AOT 安全——使用特性元数据，运行时无需反射

## 完整示例

```csharp
[SharkVersion("v1")]
public class CatalogV1Endpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("items", () => new[] { "item1", "item2" });
    }
}

[SharkVersion("v2")]
[EndpointGroup("catalog")]
public class CatalogV2Endpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("items", () => new[] { "item1", "item2", "item3" });
    }
}
```

## OpenAPI 文档

版本化端点会包含在 OpenAPI 文档中，包含完整的路径和唯一的 OperationId。文档反映了实际的路由结构。
