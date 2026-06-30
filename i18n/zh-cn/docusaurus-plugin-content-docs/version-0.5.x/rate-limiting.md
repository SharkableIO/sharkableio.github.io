---
title: 请求限流
---

# 请求限流

Sharkable 提供两种限流方式：

| 方式 | 后端 | 适用场景 |
|---|---|---|
| `ConfigureRateLimiter()` | ASP.NET Core 内置 (`PartitionedRateLimiter`) | 内存级，单实例 |
| `ConfigureRateLimiting()` | `IDistributedRateLimitStore` | 分布式（Redis、PostgreSQL 等） |

## 分布式限流（多实例推荐）

分布式限流是固定窗口中间件，底层由 `IDistributedRateLimitStore` 驱动。默认使用进程内存储（`MemoryRateLimitStore`）；多实例部署时可替换为 Redis。

:::tip Redis 插件
开箱即用的 Redis 后端已发布为 NuGet 包：

```bash
dotnet add package Sharkable.Cache.Redis
```

```csharp
builder.Services.AddSharkableRedis("localhost:6379");
builder.Services.AddShark(opt =>
{
    opt.ConfigureRateLimiting(o => o.DefaultLimit = 100);
});
```

[GitHub → Sharkable.Cache.Redis](https://github.com/SharkableIO/Sharkable.Cache.Redis)
:::

### 快速开始

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureRateLimiting(o => o.DefaultLimit = 50);
});

var app = builder.Build();
app.UseShark();
```

此配置对全部端点应用每分钟 50 次的全局限制，键为 `{clientIp}:{path}`。

### 配置

```csharp
opt.ConfigureRateLimiting(o =>
{
    // 每个窗口允许的请求数。默认 100。
    o.DefaultLimit = 50;

    // 固定窗口时长。默认 1 分钟。
    o.DefaultWindow = TimeSpan.FromMinutes(1);

    // 限流状态响应头（X-RateLimit-Limit、X-RateLimit-Remaining、X-RateLimit-Reset）。默认 true。
    o.IncludeHeaders = true;

    // 响应头前缀。默认 "X-RateLimit"。
    o.HeaderPrefix = "X-RateLimit";

    // 自定义键生成器。默认使用 {clientIp}:{path}。
    o.KeyGenerator = ctx =>
    {
        var userId = ctx.User?.FindFirst("sub")?.Value ?? "anon";
        return $"rate:{userId}";
    };
});
```

### 响应头

当 `IncludeHeaders` 为 `true` 时，每个响应包含：

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 60
```

### 429 响应

超限时返回 429，使用统一结果封装：

```json
{
  "statusCode": 429,
  "data": null,
  "errorMessage": "Rate limit exceeded. Please retry later.",
  "extra": null,
  "timeStamp": 1750934400000
}
```

## 分布式存储接口

`IDistributedRateLimitStore` 接口支持 Redis、PostgreSQL 等 KV 存储作为限流计数后端。

```csharp
public interface IDistributedRateLimitStore
{
    Task<long> IncrementAsync(string key, TimeSpan window);
    Task ResetAsync(string key);
}
```

### 默认：MemoryRateLimitStore

`MemoryRateLimitStore` 基于 `ConcurrentDictionary`，适用于单实例部署。

### 通过工厂自定义存储

在 `AddShark()` 回调中接入 Redis：

```csharp
builder.Services.AddShark(opt =>
{
    opt.RateLimitStoreFactory = sp =>
    {
        var multiplexer = sp.GetRequiredService<IConnectionMultiplexer>();
        return new RedisRateLimitStore(multiplexer);
    };
    opt.ConfigureRateLimiting(o => o.DefaultLimit = 100);
});
```

### 通过 NuGet 插件自定义存储

在 `AddShark()` **之前**注册自定义实现。`TryAddSingleton` 模式确保你的实现优先于默认值：

```csharp
services.AddSingleton<IDistributedRateLimitStore, MyCustomStore>();
builder.Services.AddShark(opt =>
{
    opt.ConfigureRateLimiting(o => o.DefaultLimit = 100);
});
```

### 优先级

| 方式 | 优先级 |
|---|---|
| `opt.RateLimitStoreFactory` | 最高（显式设置） |
| `services.AddSingleton<IDistributedRateLimitStore, T>()` 在 `AddShark` 之前 | 中（插件） |
| 默认 `MemoryRateLimitStore` | 最低（兜底） |

## ASP.NET Core 内置限流

`ConfigureRateLimiter()` 委托给 ASP.NET Core 的 `AddRateLimiter()`，适用于单实例内存限流：

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureRateLimiter(r =>
    {
        r.AddFixedWindowLimiter("fixed", o =>
        {
            o.PermitLimit = 10;
            o.Window = TimeSpan.FromSeconds(1);
        });
    });
});

// 通过 DSL 按端点应用
app.MapGet("hello", () => "hi").SharkRequireRateLimiting("fixed");
```

## 自适应限流

启用自适应模式，根据 CPU 使用率和 GC 压力动态调整限流上限：

```csharp
opt.ConfigureRateLimiting(o =>
{
    o.EnableAdaptive = true;
    o.BasePermitLimit = 100;           // 正常目标
    o.MinPermitLimit = 10;            // 高负载下限
    o.MaxPermitLimit = 500;           // 空闲上限
    o.AdaptiveCpuHighThreshold = 80;  // CPU 超过此阈值降低限流
    o.AdaptiveCpuLowThreshold = 40;   // CPU 低于此阈值提升限流
    o.AdaptiveGcHighThreshold = 80;   // GC 压力超过此阈值降低限流
    o.AdaptiveGcLowThreshold = 50;    // GC 压力低于此阈值提升限流
    o.AdaptiveReductionDivisor = 10;  // 每次降低 1/N
    o.AdaptiveAdjustmentInterval = TimeSpan.FromSeconds(5);  // 采样间隔
});
```

**工作原理：**
- 后台监控器每 `AdjustmentInterval` 采样进程 CPU + GC 数据
- **高负载**（CPU > `CpuHighThreshold` 或 GC > `GcHighThreshold`）：降低 ~BasePermitLimit/ReductionDivisor
- **低负载**（CPU < `CpuLowThreshold` 且 GC < `GcLowThreshold`）：提升 ~10%
- **中等负载**：向 `BasePermitLimit` 靠拢
- 限流值钳制在 `MinPermitLimit` 和 `MaxPermitLimit` 之间


`X-RateLimit-Limit` 响应头反映当前动态值，而非基准值。
