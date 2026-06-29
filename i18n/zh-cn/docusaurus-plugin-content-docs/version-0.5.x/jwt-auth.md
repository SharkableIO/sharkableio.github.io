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

## 与 API 密钥共存

JWT 和 [API 密钥](api-key-auth) 可以共存。
