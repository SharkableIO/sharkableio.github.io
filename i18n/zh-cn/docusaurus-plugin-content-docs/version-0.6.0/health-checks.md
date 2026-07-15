---
title: 健康检查
---

# 健康检查

Sharkable 提供 `/healthz` 端点（可通过 `opt.HealthCheckPath = "/health"` 配置），通过 ASP.NET Core 的 `HealthCheckService` 返回结构化 JSON 健康报告。

## 快速开始

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableHealthChecks = true;
});
```

`GET /healthz`：
```json
{
  "status": "healthy",
  "checks": {},
  "uptime": "02:34:12",
  "version": "0.4.0"
}
```

## 自定义检查

通过 `HealthChecksConfigure` 注册自定义健康检查：

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableHealthChecks = true;
    opt.HealthChecksConfigure = hc =>
    {
        hc.AddCheck("external-api", async () =>
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
            var response = await http.GetAsync("https://api.external.com/health");
            return response.IsSuccessStatusCode
                ? HealthCheckResult.Healthy()
                : HealthCheckResult.Degraded($"external API returned {response.StatusCode}");
        });

        hc.AddCheck<MyCustomHealthCheck>("my-check");
    };
});
```

带检查的响应：
```json
{
  "status": "degraded",
  "checks": {
    "external-api": {
      "status": "degraded",
      "description": "external API returned 503",
      "data": null,
      "exception": null
    }
  },
  "uptime": "02:34:12",
  "version": "0.4.0"
}
```

## 自动检查

配置 JWT 后，自动注册 JWT authority 可达性检查：

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableHealthChecks = true;
    opt.ConfigureJwt("https://auth.example.com", ["my-api"]);
    // JWT 检查自动添加
});
```

## NuGet 插件健康检查

插件通过 DI 自动注册健康检查。例如 `Sharkable.Cache.Redis` 提供 `RedisHealthCheck`：

```csharp
// Sharkable.Cache.Redis 自动注册健康检查
services.AddSharkableRedis("localhost:6379");
// Redis 连接状态现在出现在 /healthz 中
```

插件只需在 `AddShark()` 之前将 `IHealthCheck` 实现注册到 DI：

```csharp
// NuGet 插件扩展方法内部：
services.TryAddEnumerable(
    ServiceDescriptor.Singleton<IHealthCheck, SqlSugarHealthCheck>());
```

`HealthCheckService` 在运行时会自动发现所有 `IHealthCheck` 注册——无需额外钩子。

## 状态码

| 总体状态 | HTTP 码 | 触发条件 |
|----------|---------|----------|
| `healthy` | 200 | 所有检查通过 |
| `degraded` | 200 | 部分降级，无失败 |
| `unhealthy` | 503 | 至少一项失败，或正在关闭 |

## 就绪门控（Readiness Gate）

启动过程中，`/healthz` 在 `UseShark()` 完成所有初始化（中间件、端点、预热、饿汉单例、DI 验证）之前返回 503：

```json
{
  "status": "unhealthy",
  "checks": {
    "startup": {
      "status": "unhealthy",
      "description": "Startup not complete"
    }
  },
  "uptime": "00:00:00",
  "version": "0.6.0"
}
```

`UseShark()` 完成后，就绪门控打开，`/healthz` 开始返回实际的健康检查结果。这确保 Kubernetes 的 `readinessProbe` 在应用完全初始化之前不会路由流量。

## 优雅关闭集成

配置 [优雅关闭](graceful-shutdown) 后，关闭期间 `/healthz` 返回 503。

## 存活探针（Liveness Probe）

Sharkable 在 `/livez` 映射了一个端点，始终返回 `{"status":"alive"}` 与 HTTP 200——无论健康检查状态、就绪门控或优雅关闭如何：

```json
{
  "status": "alive"
}
```

使用 `/livez` 作为 Kubernetes `livenessProbe`，以区分进程挂起与单纯的"不健康"：

```yaml
livenessProbe:
  httpGet:
    path: /livez
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10
```

存活探针在 `EnableHealthChecks` 为 `true` 时自动启用。

## Kubernetes 探针

```yaml
livenessProbe:
  httpGet:
    path: /livez
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
```
