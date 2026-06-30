# Rate Limiting

Sharkable provides two rate limiting approaches:

| Approach | Backend | Use case |
|---|---|---|
| `ConfigureRateLimiter()` | ASP.NET Core built-in (`PartitionedRateLimiter`) | In-memory, per-instance |
| `ConfigureRateLimiting()` | `IDistributedRateLimitStore` | Distributed (Redis, PostgreSQL, etc.) |

## Distributed Rate Limiting (Recommended for Multi-Instance)

The distributed rate limiter is a fixed-window middleware backed by `IDistributedRateLimitStore`. The default store is in-process (`MemoryRateLimitStore`); swap to Redis for multi-instance deployments.

:::tip Redis Plugin
A ready-to-use Redis-backed store is available as a NuGet package:

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

### Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureRateLimiting(o => o.DefaultLimit = 50);
});

var app = builder.Build();
app.UseShark();
```

This applies a global 50-request-per-minute limit to all endpoints, keyed by `{clientIp}:{path}`.

### Configuration

```csharp
opt.ConfigureRateLimiting(o =>
{
    // Requests allowed per window. Default: 100.
    o.DefaultLimit = 50;

    // Fixed window duration. Default: 1 minute.
    o.DefaultWindow = TimeSpan.FromMinutes(1);

    // Rate limit status headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset).
    // Default: true.
    o.IncludeHeaders = true;

    // Header prefix. Default: "X-RateLimit".
    o.HeaderPrefix = "X-RateLimit";

    // Custom key generator. Default uses {clientIp}:{path}.
    o.KeyGenerator = ctx =>
    {
        var userId = ctx.User?.FindFirst("sub")?.Value ?? "anon";
        return $"rate:{userId}";
    };
});
```

### Response Headers

When `IncludeHeaders` is `true`, every response includes:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 60
```

### 429 Response

When the limit is exceeded, the middleware returns a 429 with the unified result envelope:

```json
{
  "statusCode": 429,
  "data": null,
  "errorMessage": "Rate limit exceeded. Please retry later.",
  "extra": null,
  "timeStamp": 1750934400000
}
```

## Distributed Store

The `IDistributedRateLimitStore` interface enables Redis, PostgreSQL, or any KV store as the rate limit counter backend.

```csharp
public interface IDistributedRateLimitStore
{
    Task<long> IncrementAsync(string key, TimeSpan window);
    Task ResetAsync(string key);
}
```

### Built-in: MemoryRateLimitStore

The default `MemoryRateLimitStore` uses a `ConcurrentDictionary` and is suitable for single-instance deployments.

### Custom Store via Factory

Plug in a Redis-backed store inside the `AddShark()` callback:

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

### Custom Store via Plugin (NuGet)

Register your implementation **before** `AddShark()`. The `TryAddSingleton` pattern ensures your implementation takes precedence over the default:

```csharp
services.AddSingleton<IDistributedRateLimitStore, MyCustomStore>();
builder.Services.AddShark(opt =>
{
    opt.ConfigureRateLimiting(o => o.DefaultLimit = 100);
});
```

### Priority

| Method | Priority |
|---|---|
| `opt.RateLimitStoreFactory` | Highest (explicit opt-in) |
| `services.AddSingleton<IDistributedRateLimitStore, T>()` before `AddShark` | Medium (plugin) |
| Default `MemoryRateLimitStore` | Lowest (fallback) |

## ASP.NET Core Built-in Rate Limiting

The existing `ConfigureRateLimiter()` delegates to ASP.NET Core's `AddRateLimiter()`. This remains available for per-instance in-memory limiting:

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

// Per-endpoint via DSL
app.MapGet("hello", () => "hi").SharkRequireRateLimiting("fixed");
```

## Adaptive Rate Limiting

Enable adaptive mode to dynamically adjust the permit limit based on CPU usage and GC pressure:

```csharp
opt.ConfigureRateLimiting(o =>
{
    o.EnableAdaptive = true;
    o.BasePermitLimit = 100;           // normal target
    o.MinPermitLimit = 10;            // floor under high load
    o.MaxPermitLimit = 500;           // ceiling when idle
    o.AdaptiveCpuHighThreshold = 80;  // reduce permits above this CPU %
    o.AdaptiveCpuLowThreshold = 40;   // increase permits below this CPU %
    o.AdaptiveGcHighThreshold = 80;   // reduce permits above this GC pressure %
    o.AdaptiveGcLowThreshold = 50;    // increase permits below this GC pressure %
    o.AdaptiveReductionDivisor = 10;  // reduce by 1/N each cycle
    o.AdaptiveAdjustmentInterval = TimeSpan.FromSeconds(5);  // recheck interval
});
```

**How it works:**
- A background monitor samples process CPU + GC every `AdjustmentInterval`
- **High load** (CPU > `CpuHighThreshold` or GC > `GcHighThreshold`): decrements limit by ~`BasePermitLimit/ReductionDivisor`
- **Low load** (CPU < `CpuLowThreshold` and GC < `GcLowThreshold`): increments limit by ~`BasePermitLimit/10`
- **Moderate load**: drifts toward `BasePermitLimit`
- Limit is clamped between `MinPermitLimit` and `MaxPermitLimit`

The `X-RateLimit-Limit` response header reflects the current dynamic limit, not the base.

## Coexistence

Both `ConfigureRateLimiter()` and `ConfigureRateLimiting()` can be enabled simultaneously. The ASP.NET Core built-in middleware runs first (via `app.UseRateLimiter()`), followed by the Sharkable distributed middleware. Each operates independently.
