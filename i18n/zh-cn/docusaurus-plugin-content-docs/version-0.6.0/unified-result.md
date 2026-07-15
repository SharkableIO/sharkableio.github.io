---
title: 统一响应
---

# 统一响应

Sharkable 提供了可插拔的统一响应系统，确保所有 API 端点使用一致的响应格式。

## 概述

统一响应系统分为三层：

1. **`IUnifiedResult`** — 标记接口，定义统一响应的基本结构（`StatusCode`、`Data`、`ErrorMessage`）
2. **`UnifiedResult<T>`** — 框架内置的默认实现
3. **`IUnifiedResultFactory`** — 工厂接口，替换它即可使用自己的响应格式

## 默认用法

```csharp
// 手动创建结果
var result = new UnifiedResult<string>("hello");
// { "statusCode": 200, "data": "hello", "errorMessage": null, ... }

// 带状态码
var error = new UnifiedResult<string>(null, "not found", HttpStatusCode.NotFound);
```

## 扩展方法

`string?`（错误）和 `T?`（数据）上的扩展方法，让你快速返回带 `UnifiedResult<T>` 包裹的 HTTP 响应。

### 数据/错误包装

```csharp
// 包装数据为 UnifiedResult<T> 返回 200
return data.AsOkResult();
// null → Results.Ok(), 非 null → Results.Ok(UnifiedResult<T>)

// 包装数据为 201
return data.AsCreated(uri: "/api/items/1");
// null → 204, 有 uri → Results.Created(), 无 uri → Results.Ok()

// 包装数据为 202
return data.AsAccepted(uri: "/api/jobs/42");
// null → 202, 有 uri → Results.Accepted(), 无 uri → 202 + body
```

### 错误响应（覆盖 20+ 状态码）

```csharp
return "错误".AsBadRequest();              // 400
return "过期".AsUnauthorized();            // 401
return "禁止".AsForbidden();               // 403
return "未找到".AsNotFound();               // 404
return "冲突".AsConflict();                // 409
return "不允许".AsMethodNotAllowed();       // 405
return "不可接受".AsNotAcceptable();        // 406
return "已删除".AsGone();                   // 410
return "媒体类型不支持".AsUnsupportedMediaType(); // 415
return "验证失败".AsUnprocessableEntity();  // 422
return "限流".AsTooManyRequests();          // 429
return "服务器错误".AsInternalServerError();// 500
return "未实现".AsNotImplemented();         // 501
return "网关错误".AsBadGateway();           // 502
return "服务不可用".AsServiceUnavailable(); // 503
return "超时".AsGatewayTimeout();           // 504
```

所有错误扩展方法遵循相同模式——`null` 输入返回裸状态码，非 null 错误包裹为 `UnifiedResult<string>`：

```csharp
return errorString.AsNotFound();      // { "statusCode": 404, "data": null, "errorMessage": "not found", ... }
string? nullError = null;
return nullError.AsNotFound();        // 裸 404，无 body
```

### 通用自定义状态码

```csharp
// 任意状态码 + 错误
return "错误".AsStatus(HttpStatusCode.FailedDependency);

// 任意状态码 + 数据
return data.AsStatus(HttpStatusCode.ExpectationFailed, errors: "可选");
```

## 静态工厂方法（`UnifiedResult.*`）

所有扩展方法都有对应的静态工厂，位于非泛型 `UnifiedResult` 类上：

```csharp
// 2xx 成功
UnifiedResult.Ok(data);                                        // 200
UnifiedResult.Created(data, uri: "/items/1");                  // 201
UnifiedResult.Accepted(data, uri: "/jobs/42");                 // 202
UnifiedResult.NoContent();                                     // 204

// 4xx 客户端错误
UnifiedResult.BadRequest("消息");         // 400
UnifiedResult.Unauthorized();            // 401
UnifiedResult.Forbidden();               // 403
UnifiedResult.NotFound("消息");          // 404
UnifiedResult.MethodNotAllowed("消息");   // 405
UnifiedResult.NotAcceptable("消息");      // 406
UnifiedResult.Conflict("消息");          // 409
UnifiedResult.Gone("消息");              // 410
UnifiedResult.UnsupportedMediaType("消息"); // 415
UnifiedResult.UnprocessableEntity("消息"); // 422
UnifiedResult.TooManyRequests("消息");    // 429

// 5xx 服务端错误
UnifiedResult.InternalServerError("消息"); // 500
UnifiedResult.NotImplemented("消息");     // 501
UnifiedResult.BadGateway("消息");         // 502
UnifiedResult.ServiceUnavailable("消息"); // 503
UnifiedResult.GatewayTimeout("消息");     // 504

// 通用自定义状态码
UnifiedResult.Status(data, HttpStatusCode.FailedDependency, errors: "消息");
```

静态工厂返回 `IResult`，行为与扩展方法完全一致。

## 自动包装（EnableAutoWrap）

开启后，返回值不是 `IResult` 的端点会被自动包装：

```csharp
app.UseShark(opt =>
{
    opt.EnableAutoWrap = true;
});

app.MapGet("hello", () => "world");
// 响应：{ "statusCode": 200, "data": "world", ... }
```

## 自定义响应格式

实现 `IUnifiedResult` 和 `IUnifiedResultFactory` 来使用自己的响应格式：

```csharp
public class MyResult : IUnifiedResult
{
    public int Code { get; set; }
    public object? Info { get; set; }
    public string? Error { get; set; }

    int IUnifiedResult.StatusCode => Code;
    object? IUnifiedResult.Data => Info;
    string? IUnifiedResult.ErrorMessage => Error;
}

public class MyResultFactory : IUnifiedResultFactory
{
    public IUnifiedResult Create(object? data, string? errorMessage, int statusCode)
        => new MyResult { Code = statusCode, Info = data, Error = errorMessage };
}
```

在 `AddShark()` 中注册工厂：

```csharp
builder.Services.AddShark(opt =>
{
    opt.UnifiedResultFactory = new MyResultFactory();
});
```

此后所有异常处理器和自动包装的响应都会使用 `MyResult` 格式。

> **重要：** 使用自定义响应格式配合 `EnableAutoWrap` 时，OpenAPI 文档转换器仍会按默认的 `UnifiedResult<T>` 结构生成 schema。要让生成的 OpenAPI 文档匹配实际的响应格式，请设置 `WrapSchemaFactory`：

```csharp
builder.Services.AddShark(opt =>
{
    opt.UnifiedResultFactory = new MyResultFactory();
    opt.EnableAutoWrap = true;
    opt.WrapSchemaFactory = (original) => new OpenApiSchema
    {
        Type = JsonSchemaType.Object,
        Properties = new Dictionary<string, IOpenApiSchema>
        {
            ["code"] = new OpenApiSchema { Type = JsonSchemaType.Integer },
            ["info"] = original,
            ["error"] = new OpenApiSchema { Type = JsonSchemaType.String },
        },
    };
});
```

这需要在 Program.cs 中添加 `using Microsoft.OpenApi;`。

## AOT 支持

Sharkable 内置 Source Generator，自动保留所有端点返回值的 `UnifiedResult<T>` 类型——**无需 `JsonSerializerContext`**：

```csharp
app.MapGet("/users", () => new UserDto { Name = "Alice" });
app.MapGet("/orders", () => new OrderDto { Id = 1 });
// UnifiedResult<UserDto> + UnifiedResult<OrderDto> 编译时自动保留
```

SG 扫描所有 `MapGet/Post/Put/Patch/Delete` 委托，提取返回类型，发出 `typeof(UnifiedResult<T>)` 引用。配合 AutoCrud AOT 保留器，所有实体类型和统一结果类型在 Native AOT 剪裁后存活，无需手动配置。

自定义 `IUnifiedResultFactory` 的自定义类型需注册 JSON 序列化上下文：

```csharp
[JsonSerializable(typeof(MyResult))]
internal partial class AppJsonContext : JsonSerializerContext { }

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default);
});
```

## 自动 UnifiedResult 包装（可选）

开启后，返回值不是 `IResult` 的端点会被自动包装为 `UnifiedResult<T>`：

```csharp
app.UseShark(opt =>
{
    opt.EnableAutoWrap = true;
});
```

```csharp
// 之前：直接返回字符串
app.MapGet("hello", () => "world");

// 之后（开启 EnableAutoWrap）：
// 响应：{ "statusCode": 200, "data": "world", ... }
```

> **注意：** 自动包装使用反射和 `MakeGenericType` — 在 AOT 模式下只有当你将具体的 `UnifiedResult<T>` 类型通过 `[JsonSerializable]` 注册到 `JsonSerializerContext` 中才能正常工作。

## ProblemDetails (RFC 7807)

Sharkable 支持 RFC 7807 ProblemDetails 作为替代错误响应格式。一行启用：

```csharp
builder.Services.AddShark(opt =>
{
    opt.UseProblemDetails = true;
});
```

**标准格式**（所有错误响应）：

```json
{
  "type": "https://httpstatuses.com/429",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "限流已超，请稍后重试。",
  "instance": "/api/orders",
  "traceId": "4bf92f3577b34ad00000000000000000"
}
```

关闭（默认）时，错误响应使用 Sharkable 统一结果格式。`UseProblemDetails` 影响框架生成的所有错误：400、401、403、404、409、422、429、500、503。
```
