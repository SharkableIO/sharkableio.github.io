---
title: 生命周期钩子
---

# 生命周期钩子

Sharkable 提供了多个在应用启动和关闭期间运行的钩子与服务，让你精细控制应用生命周期。

## 启动横幅

`UseShark()` 完成时，Sharkable 会在控制台打印格式化的横幅，显示版本、环境和 UTC 时间戳：

```
╔══════════════════════════════════════════════╗
║             Sharkable v0.6.0                 ║
║             Environment: Development          ║
║             Started at:  2026-07-15 12:34:56  ║
╚══════════════════════════════════════════════╝
```

横幅在 `UseShark()` 结束时打印，在所有初始化、预热和验证完成之后。设置 `ShowStartupBanner = false` 可禁用：

```csharp
builder.Services.AddShark(opt =>
{
    opt.ShowStartupBanner = false;
});
```

## 应用生命周期钩子

注册 `IHostApplicationLifetime` 事件的回调：

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureOnStarted(sp =>
    {
        // 在 app.Run() 开始接受请求后执行
        var logger = sp.GetRequiredService<ILogger<Program>>();
        logger.LogInformation("应用已启动，准备服务");
    });

    opt.ConfigureOnStopped(sp =>
    {
        // 在 SIGTERM/优雅关闭时执行
        var logger = sp.GetRequiredService<ILogger<Program>>();
        logger.LogInformation("应用正在停止");
    });
});
```

`ConfigureOnStarted` 回调在 `IHostApplicationLifetime.ApplicationStarted` 触发时执行（服务器启动后）。`ConfigureOnStopped` 回调在 `ApplicationStopping` 时执行（优雅关闭期间）。两者都接收根 `IServiceProvider`。

## 预热服务

实现 `IWarmupService` 在 `UseShark()` 期间同步运行初始化逻辑，在就绪门控打开之前：

```csharp
public class DatabaseWarmup : IWarmupService
{
    private readonly MyDbContext _db;

    public DatabaseWarmup(MyDbContext db)
    {
        _db = db;
    }

    public async Task WarmupAsync(CancellationToken cancellationToken)
    {
        // 执行数据库迁移、种子数据、预编译查询
        await _db.Database.EnsureCreatedAsync(cancellationToken);
    }
}
```

注册预热服务：

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureWarmup<DatabaseWarmup>();
});
```

Sharkable 从 DI 解析预热服务，使用 30 秒超时调用 `WarmupAsync()`，成功后才打开就绪门控。抛出异常则启动失败。

## 饿汉单例（Eager Singleton）

将单例服务标记为 `Eager = true`，使其在 `UseShark()` 期间从 DI 解析，而非在首次访问时延迟初始化：

```csharp
[SingletonService(Eager = true)]
public interface ICacheWarmup
{
    void Preload();
}

public class CacheWarmup : ICacheWarmup
{
    public void Preload()
    {
        // 初始化缓存，连接远程服务等
    }
}
```

该服务在启动期间、就绪门控打开之前以及服务器开始接受请求之前解析。这确保加载的单例在流量到达之前完全初始化。

## 分组与端点约定

使用 `GroupConvention` 和 `EndpointConvention` 以声明式方式对分组或端点统一应用中间件、过滤器或元数据：

```csharp
builder.Services.AddShark(opt =>
{
    opt.GroupConvention = (group, name) =>
    {
        group.RequireAuthorization();
        group.WithOpenApi();
    };

    opt.EndpointConvention = (group, type) =>
    {
        group.WithMetadata(new ProducesResponseTypeMetadata
        {
            StatusCode = 200,
            ContentTypes = ["application/json"]
        });
    };
});
```

- `GroupConvention` 在每个端点分组（如 `api/users`）上调用一次。用于对整个分组应用共享的授权、OpenAPI 或中间件。
- `EndpointConvention` 在每个端点类上调用一次。用于 `ProducesResponseType` 元数据、通用过滤器或类级别的 Transformer 注册。

## 并行预热

通过多次 `ConfigureWarmup<T>()` 调用注册的多个 `IWarmupService` 实现在启动期间**并行**运行：

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureWarmup<DatabaseWarmup>();
    opt.ConfigureWarmup<CacheWarmup>();
});
```

每个预热服务：
- 与其他预热服务并发运行
- 具有独立的 30 秒超时（可按服务自定义）
- 抛出异常则启动失败 — 聚合异常会被传播

## 管道注入点

使用 `UseSharkOptions` 在 Sharkable 管道的特定位置注入自定义中间件：

```csharp
app.UseShark(opt =>
{
    // 在认证/授权之前运行
    opt.AddBeforeAuth(app =>
    {
        app.Use(async (context, next) =>
        {
            // 自定义预认证逻辑（请求日志、标头验证）
            await next(context);
        });
    });

    // 在认证/授权之后、端点之前运行
    opt.AddAfterAuth(app =>
    {
        app.UseMiddleware<CustomTenantMiddleware>();
    });

    // 在所有 Sharkable 端点映射之后运行
    opt.AddAfterEndpoints(app =>
    {
        app.MapFallback(() => Results.NotFound());
    });
});
```

可用的注入点（按管道顺序）：

| 注入点 | 位置 | 用途 |
|--------|------|------|
| `AddBeforeAuth` | CORS 之后，Authentication 之前 | 请求日志、标头验证 |
| `AddAfterAuth` | Authorization 之后，异常处理器之前 | 租户解析、语言设置 |
| `AddAfterEndpoints` | 所有端点映射之后 | 回退路由、自定义错误页面 |

## DI 验证

在启动时验证关键服务注册。如果服务无法解析，`UseShark()` 立即抛出异常，防止服务器在依赖损坏的情况下启动：

```csharp
builder.Services.AddShark(opt =>
{
    opt.ValidateOnStart<IMyService>();
    opt.ValidateOnStart<IOtherService>();
});
```

每个注册的类型在 `UseShark()` 期间通过 `GetRequiredService<T>()` 解析，在就绪门控打开之前。这在开发期间提供快速反馈，并防止生产环境中的静默故障。
