---
title: 鉴权拦截器
---

# 鉴权拦截器

Sharkable 提供可插拔的 `IAuthorizationInterceptor`，在每条端点请求前运行。用于声明式 RBAC、租户范围访问控制、自定义 API 密钥验证等场景。

## 快速开始

```csharp
builder.Services.AddShark(opt =>
{
    opt.AuthorizationInterceptorFactory = sp => new MyPermissionInterceptor();
});
```

## 实现

```csharp
public class MyPermissionInterceptor : IAuthorizationInterceptor
{
    public IResult? Authorize(HttpContext ctx)
    {
        // JWT claims
        var userId = ctx.User.FindFirst("sub")?.Value;
        var roles = ctx.User.FindAll("role").Select(c => c.Value).ToList();

        // API 密钥
        ctx.Request.Headers.TryGetValue("X-Api-Key", out var apiKey);

        // 自定义逻辑
        if (!HasAccess(userId, ctx.Request.Path))
            return Results.Json(new { error = "No permission" }, statusCode: 403);

        // 放行
        return null;
    }
}
```

## 约定

- **返回 `null`** → 请求继续到端点
- **返回 `IResult`** → 立即发送响应，跳过端点
- 接收完整 `HttpContext`，可访问 `User`（ClaimsPrincipal）、请求头、路径等
- 在认证**之后**、端点处理**之前**运行
- 作为 `IEndpointFilter` 应用于所有路由组

## RBAC 示例

```csharp
public class RbacInterceptor : IAuthorizationInterceptor
{
    private static readonly Dictionary<string, string[]> RolePermissions = new()
    {
        ["admin"] = ["order:read", "order:write", "product:read", "product:write"],
        ["user"] = ["order:read", "product:read"],
    };

    public IResult? Authorize(HttpContext ctx)
    {
        var roles = ctx.User.FindAll("role").Select(c => c.Value).ToList();
        var path = ctx.Request.Path.Value ?? "";
        var method = ctx.Request.Method;
        var action = method switch { "GET" or "HEAD" => "read", _ => "write" };

        var segments = path.Trim('/').Split('/');
        var resource = segments.Length >= 2 ? segments[1] : "";

        foreach (var role in roles)
            if (RolePermissions.TryGetValue(role, out var perms) && perms.Contains($"{resource}:{action}"))
                return null;

        return Results.Json(new { error = "Insufficient permissions" }, statusCode: 403);
    }
}
```

## 租户隔离

```csharp
public class TenantInterceptor : IAuthorizationInterceptor
{
    public IResult? Authorize(HttpContext ctx)
    {
        var tenantClaim = ctx.User.FindFirst("tenant_id")?.Value;
        var tenantFromHeader = ctx.Request.Headers["X-Tenant-Id"].ToString();
        if (tenantClaim != tenantFromHeader)
            return Results.Json(new { error = "Tenant mismatch" }, statusCode: 403);
        return null;
    }
}
```
