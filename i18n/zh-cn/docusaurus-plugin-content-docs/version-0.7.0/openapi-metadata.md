---
title: OpenAPI 元数据特性
---

# OpenAPI 元数据特性

Sharkable 提供一组声明式特性，用于在 `ISharkEndpoint` 类上直接配置 OpenAPI 元数据。

## `[SharkDescription]`

为端点组下的所有操作设置默认 `summary` 和 `description`。

```csharp
[SharkDescription("用户管理", "创建、查询和修改用户信息的端点")]
public class UserEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("profile", () => "user profile");
        app.MapPost("create", (UserDto dto) => Results.Ok(dto));
    }
}
```

两个操作均继承 `summary` 为"用户管理"、`description` 为"创建、查询和修改用户信息的端点"。单个操作上通过 `.WithSummary()` / `.WithDescription()` 设置的元数据优先级更高。

## `[SharkResponseType]`

为端点组下所有操作添加额外响应信息。可重复使用。

```csharp
[SharkResponseType(200, typeof(UserDto), "操作成功")]
[SharkResponseType(400, typeof(ValidationProblemDetails), "请求参数无效")]
[SharkResponseType(404, null, "资源不存在")]
public class UserEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("{id}", (int id) => { ... });
    }
}
```

这些响应信息会出现在 OpenAPI 文档的每个操作中。`responseType` 可省略，此时仅记录状态码与描述。

## `[SharkDeprecated]`

标记端点组中所有操作为已废弃。反映为 `deprecated: true`，不影响运行时行为。

```csharp
[SharkDeprecated]
public class OldEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("legacy", () => "old way");
    }
}
```

对应 OpenAPI 输出中的 `deprecated: true`，工具链（如客户端生成器）据此跳过该端点。

## `[SharkTag]`

覆盖默认从组名推导的 OpenAPI 标签。可重复使用，为操作分配多个标签。

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

OpenAPI 标签为 `["admin", "management"]`。如不指定 `[SharkTag]`，则使用从类名自动推导的组名作为默认标签。

## 特性组合

上述特性可同时使用：

```csharp
[SharkDescription("库存服务", "商品库存查询与操作")]
[SharkResponseType(200, typeof(InventoryDto), "成功返回库存信息")]
[SharkResponseType(404, null, "商品不存在")]
[SharkDeprecated]
[SharkTag("warehouse")]
public class InventoryEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("{sku}", (string sku) => { ... });
    }
}
```

## 缓存配置

`[SharkCacheProfile]` 在端点组级别控制响应缓存。它与 ASP.NET Core 的输出缓存中间件集成，可按端点设置缓存时长、vary-by 规则和缓存配置。

完整配置、用法及 OpenAPI 集成请参见 [响应缓存配置](response-cache-profile) 页面。

## 操作与 Schema 转换器

通过 `SharkOption` 注册 OpenAPI 操作和 Schema 转换器，无需直接操作 `OpenApiOptions`：

```csharp
builder.Services.AddShark(opt =>
{
    opt.AddOpenApiOperationTransformer((operation, context, cancellationToken) =>
    {
        operation.Description = "自定义描述";
        return Task.CompletedTask;
    });

    opt.AddOpenApiSchemaTransformer((schema, context, cancellationToken) =>
    {
        schema.Example = new OpenApiString("示例值");
        return Task.CompletedTask;
    });
});
```

- `AddOpenApiOperationTransformer(...)` — 通过框架注册 `IOpenApiOperationTransformer`，将 OpenAPI 配置集中在 `AddShark()` 中。
- `AddOpenApiSchemaTransformer(...)` — 对 `IOpenApiSchemaTransformer` 采用相同模式。
- `opt.OpenApiExampleFactory` — 按端点或响应类型自定义示例生成的钩子：

```csharp
opt.OpenApiExampleFactory = (ctx, schema) => new OpenApiObject
{
    ["name"] = new OpenApiString("示例"),
    ["value"] = new OpenApiInteger(42),
};
```

## 优先级说明

| 覆盖方式 | 优先级 |
|---|---|
| 单个操作上的 `.WithSummary()` / `.WithDescription()` / `.WithOpenApi()` | 最高 |
| 类级别 `[SharkDescription]` / `[SharkResponseType]` / `[SharkDeprecated]` / `[SharkTag]` | 中 |
| 框架默认值（自动推导的标签、空 summary） | 最低 |

## 旧风格 `[SharkEndpoint]` 端点（AOT 不兼容）

> ⚠️ 基于属性的端点使用运行时反射，**不**支持 Native AOT 发布。请使用 `ISharkEndpoint` 编写兼容 AOT 的代码。

基于属性的旧风格端点同样支持这些元数据特性：

```csharp
[SharkEndpoint]
[SharkDescription("目录查询", "查询商品分类目录")]
[SharkTag("catalog")]
[SharkResponseType(200, typeof(List<Category>), "目录列表")]
public class CatalogEndpoint
{
    [SharkMethod("list", SharkHttpMethod.GET)]
    public List<Category> GetList() { ... }
}
```
