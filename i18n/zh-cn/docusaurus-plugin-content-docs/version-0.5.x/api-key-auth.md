---
title: API 密钥认证
---

# API 密钥认证

Sharkable 提供两种 API 密钥认证模式：

| 模式 | 适用场景 | 配置 |
|------|----------|------|
| 静态列表 | 开发 / 简单场景 | `opt.ApiKeys = [...]` |
| 拦截器 | 每客户端密钥、权限、过期 | `IAuthorizationInterceptor` |

## 快速开始（静态列表）

```csharp
builder.Services.AddShark(opt =>
{
    opt.ApiKeys = ["your-secret-key", "another-key"];
});
```

客户端默认发送 `X-Api-Key` 头。可通过 `opt.ApiKeyHeaderName = "X-App-Key"` 自定义请求头名称。有效密钥放行，无效或缺失返回 401。

## 每客户端密钥 + 权限 + 过期

生产环境下，实现 `IAuthorizationInterceptor` 通过自己的 store（数据库、Redis 等）验证密钥：

```csharp
builder.Services.AddShark(opt =>
{
    opt.ApiKeys = null; // 禁用静态列表
    opt.AuthorizationInterceptorFactory = sp => new ApiKeyValidator();
});
```

```csharp
public class ApiKeyValidator : IAuthorizationInterceptor
{
    public IResult? Authorize(HttpContext ctx)
    {
        ctx.Request.Headers.TryGetValue("X-Api-Key", out var key);
        if (string.IsNullOrEmpty(key))
            return Results.Json(new { error = "Missing API key" }, statusCode: 401);

        // 通过你自己的 store 验证
        var info = _myStore.Get(key);
        if (info == null)
            return Results.Json(new { error = "Invalid API key" }, statusCode: 401);
        if (info.ExpiresAt < DateTimeOffset.UtcNow)
            return Results.Json(new { error = "API key expired" }, statusCode: 401);

        // 将客户端信息暴露给下游端点
        ctx.Items["ApiKeyClient"] = info.Client;
        ctx.Items["ApiKeyScopes"] = info.Scopes;

        return null; // 放行
    }
}
```

### 下游使用

端点可读取拦截器设置的信息：

```csharp
app.MapGet("/orders", (HttpContext ctx) =>
{
    var client = ctx.Items["ApiKeyClient"] as string;
    var scopes = ctx.Items["ApiKeyScopes"] as string[];
    // 基于 scope 的访问控制
});
```

### 与 JWT 共存

拦截器可同时处理 API 密钥和 JWT：

```csharp
public IResult? Authorize(HttpContext ctx)
{
    if (ctx.User.Identity?.IsAuthenticated == true)
    {
        var sub = ctx.User.FindFirst("sub")?.Value;
        ctx.Items["Client"] = sub;
        return null;
    }
    ctx.Request.Headers.TryGetValue("X-Api-Key", out var key);
    // ... 验证 API 密钥
}
```

## 统一错误响应

认证失败返回框架标准的统一结果封装。
