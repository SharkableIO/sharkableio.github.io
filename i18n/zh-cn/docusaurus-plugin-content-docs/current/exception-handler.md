---
title: 异常处理器
---

# 异常处理器 & 自动统一响应

Sharkable 内置了全局异常处理中间件，能将未处理的异常转换为统一的 `UnifiedResult<T>` JSON 响应，同时可选的自动包装过滤器能将端点返回值自动包装为 `UnifiedResult<T>`。

## 全局异常处理器

调用 `app.UseShark()` 时默认启用。会捕获端点和中间件中所有未处理的异常，映射为 HTTP 状态码，并返回 `UnifiedResult<object?>` JSON 响应。

### 默认状态码映射

| 异常类型 | HTTP 状态码 |
|---|---|
| `KeyNotFoundException` | 404 Not Found |
| `UnauthorizedAccessException` | 401 Unauthorized |
| `ArgumentException` | 400 Bad Request |
| 其他异常 | 500 Internal Server Error |

### 响应格式

```json
{
  "StatusCode": 404,
  "Data": null,
  "ErrorMessage": "user not found",
  "Extra": null,
  "TimeStamp": 1780881487673,
  "Result": null
}
```

在开发模式（`ASPNETCORE_ENVIRONMENT=Development`）下，错误信息会包含完整堆栈跟踪。

### 自定义错误映射

```csharp
app.UseShark(opt => { });

// 或单独使用：
app.UseSharkExceptionHandler(opt =>
{
    opt.Map<MyCustomException>(HttpStatusCode.Forbidden);
});
```

### 禁用

```csharp
app.UseShark(opt =>
{
    opt.EnableExceptionHandler = false;
});
```

## ProblemDetails（RFC 7807）

Sharkable 支持 RFC 7807 ProblemDetails 作为备选错误响应格式。一行启用：

```csharp
opt.UseProblemDetails = true;
```

启用后，所有错误响应从统一结果封包切换为 `application/problem+json`：

```json
{
  "type": "https://httpstatuses.com/404",
  "title": "Not Found",
  "status": 404,
  "detail": "user not found",
  "instance": "/api/users/42",
  "traceId": "c8a0f6e4-9b2d-4f1a-b3c7-2e5d8a1f0b6c"
}
```

### 自定义 ProblemDetails 字段

`type` URI 和 `title` 可通过工厂委托自定义：

```csharp
opt.ProblemDetailsTypeFactory = status => $"https://example.com/errors/{status}";
opt.ProblemDetailsTitleFactory = status => status switch
{
    400 => "Bad Request",
    404 => "Not Found",
    _ => "Error"
};
```

## ETag / 304 Not Modified

Sharkable 提供可选的 GET/HEAD 响应的 ETag 支持：

```csharp
opt.EnableETag = true;
```

### ETag 配置

```csharp
opt.ETagOptions = new ETagOptions
{
    // 可被 ETag 缓存的 HTTP 方法。默认：GET、HEAD
    CacheableMethods = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "GET", "HEAD" },

    // ETag 响应中的 Cache-Control 头。默认："public, max-age=0, must-revalidate"
    CacheControlHeader = "public, max-age=3600",

    // 判断哪些状态码应跳过的谓词。默认跳过 < 200 和 >= 300
    ShouldSkipStatus = status => status is < 200 or >= 300,

    // 排除路径（前缀匹配）
    ExcludePaths = ["/healthz", "/openapi", "/scalar", "/_sharkable"],
};
```

## 错误本地化

Sharkable 支持通过 `Accept-Language` 请求头实现可插拔的错误消息翻译。

### 注册

```csharp
builder.Services.AddShark(opt =>
{
    // 注册自定义本地化实现
    opt.ErrorLocalizerFactory = sp => new MyErrorLocalizer();

    // 缺少 Accept-Language 头时的默认语言。默认："en"。
    opt.DefaultCulture = "zh-CN";
});
```

### 实现 IErrorLocalizer

```csharp
public class MyErrorLocalizer : IErrorLocalizer
{
    private readonly Dictionary<string, Dictionary<string, string>> _messages = new()
    {
        ["Welcome"] = new()
        {
            ["en"] = "Welcome",
            ["zh-CN"] = "欢迎",
            ["ja"] = "ようこそ",
        },
        ["User_NotFound"] = new()
        {
            ["en"] = "User not found",
            ["zh-CN"] = "用户未找到",
            ["ja"] = "ユーザーが見つかりません",
        },
    };

    public string Localize(string key, string culture)
    {
        if (_messages.TryGetValue(key, out var cultures) &&
            cultures.TryGetValue(culture, out var message))
            return message;

        return key; // 回退到 key 本身
    }
}
```

### 在端点中使用

注入 `HttpContext` 并调用 `.Localize()` 扩展方法：

```csharp
app.MapGet("/hello", (HttpContext ctx) =>
{
    var msg = ctx.Localize("Welcome");
    return Results.Ok(new { message = msg });
});
```

客户端发送 `Accept-Language: zh-CN` → `{ "message": "欢迎" }`。

`.Localize()` 扩展方法会自动从 `Accept-Language` 头解析语言，不需要手动解析。

### 中间件集成

已支持本地化的框架中间件：
- **限流**（429）— key：`"RateLimitExceeded"`
- **优雅关闭**（503）— key：`"ServerShuttingDown"`

自定义中间件中也可以使用相同的模式：

```csharp
app.Use(async (ctx, next) =>
{
    if (someCondition)
    {
        ctx.Response.StatusCode = 400;
        await ctx.Response.WriteAsync(ctx.Localize("CustomError"));
        return;
    }
    await next();
});
```

## 自动 UnifiedResult 包装（可选）

开启后，返回值不是 `IResult` 的端点会被自动包装为 `UnifiedResult<T>`。

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
