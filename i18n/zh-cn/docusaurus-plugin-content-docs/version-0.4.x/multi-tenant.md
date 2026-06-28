---
title: 多租户
---

# 多租户 / Multi-Tenant

Sharkable 提供可选启用的多租户解析系统。通过 Scoped 服务 `ITenant` 注入到任何需要租户感知的类中，租户标识在每次请求时经由可配置的中间件解析。

## 快速开始

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureMultiTenant(cfg =>
    {
        cfg.ResolveTenant = ctx =>
            TenantResolver.FromHost(ctx)
            ?? TenantResolver.FromClaim(ctx);
    });
});

var app = builder.Build();
app.UseShark();   // 自动注册 TenantResolutionMiddleware
```

在任何地方注入 `ITenant`：

```csharp
public class OrderService
{
    private readonly ITenant _tenant;

    public OrderService(ITenant tenant)
    {
        _tenant = tenant;
    }

    public async Task<List<Order>> GetOrdersAsync()
    {
        var tenantId = _tenant.TenantId;
        // 按 tenantId 做数据隔离
    }
}
```

## 解析租户

`TenantResolutionMiddleware` 在每个请求开始时执行租户解析，结果写入当前请求的 Scoped `ITenant` 实例。

中间件在每个请求开始时检查 `TenantOptions.ResolveTenant` 委托。通过 `ConfigureMultiTenant()` 设置。

### 内置解析器

```csharp
// 子域名：tenant1.myapp.com → "tenant1"
TenantResolver.FromHost(HttpContext)

// JWT Claim：读取 "tenant_id" claim（可自定义）
TenantResolver.FromClaim(HttpContext, claimType: "tenant_id")
```

用 `??` 链式组合实现 fallback：

```csharp
cfg.ResolveTenant = ctx =>
    TenantResolver.FromHost(ctx)
    ?? TenantResolver.FromClaim(ctx, "tenant_id");
```

### 自定义委托

支持任意解析策略：

```csharp
cfg.ResolveTenant = ctx =>
{
    var header = ctx.Request.Headers["X-Tenant"].FirstOrDefault();
    return !string.IsNullOrEmpty(header) ? header : null;
};
```

## 配置

```csharp
opt.ConfigureMultiTenant(cfg =>
{
    // Func<HttpContext, string?> — 无法解析时返回 null
    cfg.ResolveTenant = ctx => TenantResolver.FromClaim(ctx);
});
```

## 行为

| 场景 | 结果 |
|---|---|
| 解析器返回值 | 本次请求的 `ITenant.TenantId` 被设置 |
| 解析器返回 `null` | `ITenant.TenantId` 为 `null`；应用自行处理 |
| 未调用 `ConfigureMultiTenant` | 不会注册中间件，不做租户解析 |
| 多个解析器链式组合 | 第一个非 null 结果生效 |

## 数据源隔离

通过 `ITenantDataSource` 按租户路由数据库连接。在任意位置注入即可获取当前请求对应的正确连接串：

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureMultiTenant(cfg =>
    {
        cfg.ResolveTenant = ctx => TenantResolver.FromHost(ctx);

        cfg.ConfigureDataSource(o =>
        {
            o.ConnectionStringResolver = tenantId =>
                $"Server=db-{tenantId}.internal;Database=myapp";
        });
    });
});

// 任意 Scoped 服务中：
public class OrderService
{
    private readonly ITenantDataSource _ds;
    public OrderService(ITenantDataSource ds) => _ds = ds;

    public void Connect()
    {
        var connStr = _ds.GetConnectionString(); // 自动按租户解析
    }
}
```

`ITenantDataSource` 是 Scoped 服务，从 `ITenant` 获取当前租户，再通过 `ConnectionStringResolver` 映射为连接串。租户未解析时返回 `null`。

NuGet 插件（如 `Sharkable.AutoCrud.SqlSugar`）可将 `ITenantDataSource` 注入其 DB 客户端注册中，让注入的客户端自动指向正确的租户数据库——用户代码零修改。

## AOT 支持

完全 AOT 安全。无反射、无 `dynamic`。中间件通过 `Func<HttpContext, string?>` 委托解析租户，`ITenant` / `Tenant` 均为普通接口和类。
