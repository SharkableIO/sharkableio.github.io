---
title: 健康检查
---

# 健康检查

Sharkable 提供 `/healthz` 端点，通过 ASP.NET Core 的 `HealthCheckService` 返回结构化 JSON 健康报告。

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

其他自动检查可通过 NuGet 插件添加（如 `Sharkable.AutoCrud.SqlSugar` 添加数据库连接检查）。插件只需在 `AddShark()` 之前将 `IHealthCheck` 实现注册到 DI：

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

## 优雅关闭集成

配置 [优雅关闭](graceful-shutdown) 后，关闭期间 `/healthz` 返回 503。

## Kubernetes 就绪探针

```yaml
readinessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
```
