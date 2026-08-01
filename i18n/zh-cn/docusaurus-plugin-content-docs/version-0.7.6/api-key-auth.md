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

## 自定义 API 密钥验证器

对于高级场景（数据库支持的密钥、带权限的密钥、租户关联），实现 `IApiKeyValidator` 代替静态 `ApiKeys` 数组：

```csharp
public class DatabaseApiKeyValidator : IApiKeyValidator
{
    public async Task<ApiKeyValidationResult> ValidateAsync(
        string key, HttpContext context, CancellationToken cancellationToken)
    {
        // 在你的存储中查找密钥
        var apiKey = await _db.ApiKeys
            .Include(k => k.Tenant)
            .FirstOrDefaultAsync(k => k.Key == key, cancellationToken);

        if (apiKey is null)
            return ApiKeyValidationResult.Fail();

        return ApiKeyValidationResult.Success(new List<Claim>
        {
            new("client_id", apiKey.ClientId),
            new("tenant", apiKey.Tenant.Name),
        }, rateLimitMultiplier: apiKey.Tier == "premium" ? 5.0 : 1.0);
    }
}
```

在 `AddShark()` **之前**通过 DI 注册：

```csharp
services.AddSingleton<IApiKeyValidator, DatabaseApiKeyValidator>();
builder.Services.AddShark();
```

- `ApiKeyValidationResult` 携带 `Claim` 列表（自动设置为 `HttpContext.User.ClaimsPrincipal`）以及可选的 `RateLimitMultiplier`，用于按客户端进行速率限制缩放。
- 未注册自定义实现时，默认验证器使用静态 `ApiKeys` 数组配合 SHA-256 比对。
- 同时配置 `IApiKeyValidator` 和静态 `ApiKeys` 时，自定义验证器优先。

## 统一错误响应

认证失败返回框架标准的统一结果封装。
