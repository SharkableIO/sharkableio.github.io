---
title: JWT Bearer 认证
---

# JWT Bearer 认证

Sharkable 提供预配置的 JWT Bearer 认证，只需最少配置。

## 快速开始

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureJwt(
        authority: "https://your-issuer.com",
        audiences: ["your-api"],
        configure: jwt =>
        {
            // 可选的额外 JwtBearerOptions 配置
        }
    );
});
```

## 统一错误响应

认证失败（401）和授权失败（403）返回框架标准的统一结果封装。

## 配置校验

启动时 Sharkable 会验证 `authority` 和 `audiences` 是否配置正确。详见 [配置校验](config-validation)。

## 自定义 JWT 事件

通过 `configure` 回调钩入 JWT 事件，不会丢失 Sharkable 的统一错误响应：

```csharp
opt.ConfigureJwt("https://your-issuer.com", ["your-api"], configure: jwt =>
{
    jwt.Events.OnTokenValidated = ctx =>
    {
        var sub = ctx.Principal.FindFirst("sub")?.Value;
        var roles = ctx.Principal.FindAll("role");
        // 解析用户信息
        return Task.CompletedTask;
    };
});
```

Sharkable 的 `OnChallenge` / `OnForbidden` 在你的 handler **之后**运行且**不会被覆盖**。如果你已启动了响应，Sharkable 的 handler 会跳过。

## 鉴权拦截器

需要细粒度 RBAC 时，实现 `IAuthorizationInterceptor`：

```csharp
opt.AuthorizationInterceptorFactory = sp => new MyPermissionInterceptor();
```

详见 [鉴权拦截器](authorization-interceptor)。

## 授权配置

Sharkable 默认注册 ASP.NET Core 的授权服务（`services.AddAuthorization()`），确保 `pipe.UseAuthorization()` 在任何地方调用时都不会因缺少服务而崩溃。三个选项控制此行为：

| 选项 | 类型 | 默认值 | 说明 |
|--------|------|---------|------|
| `EnableAuthorization` | `bool` | `true` | 设为 `false` 跳过授权服务注册 |
| `RequireAuthenticatedByDefault` | `bool` | `false` | 启用时自动为每个端点注入 `[Authorize]` 元数据（相当于在每个端点上调用 `.RequireAuthorization()`）。已有 `IAuthorizeData` 或 `IAllowAnonymous` 的端点会跳过。 |
| `ConfigureAuthorization` | `Action<AuthorizationOptions>?` | `null` | 自定义策略、默认策略、回退策略等 |

### 自定义授权策略

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureJwt("https://your-issuer.com", ["your-api"]);

    opt.ConfigureAuthorization = o =>
    {
        o.DefaultPolicy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .Build();

        o.AddPolicy("admin", p => p.RequireRole("admin"));
        o.AddPolicy("editor", p => p.RequireRole("editor", "admin"));
    };
});
```

### 禁用授权

```csharp
opt.EnableAuthorization = false;
```

禁用授权（`EnableAuthorization = false`）会同时跳过 `services.AddAuthorization()` 和 `app.UseAuthorization()`。仅当应用完全不需要 ASP.NET Core 授权时使用。

## 与 API 密钥共存

JWT 和 [API 密钥](api-key-auth) 可以共存。
