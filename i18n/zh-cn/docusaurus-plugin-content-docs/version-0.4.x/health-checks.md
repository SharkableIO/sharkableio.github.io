---
title: 健康检查
---

# 健康检查

Sharkable 提供 `/healthz` 端点，返回应用健康状态。

## 快速开始

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableHealthChecks = true;
});
```

`/healthz` 端点返回：

```
HTTP 200 OK
Content-Type: text/plain
healthy
```

## 优雅关闭集成

配置 [优雅关闭](graceful-shutdown) 时，健康检查在关闭期间自动返回 503，通知负载均衡器和 Kubernetes 停止将流量路由到该实例：

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableHealthChecks = true;
    opt.ConfigureGracefulShutdown(g => g.DrainTimeout = TimeSpan.FromSeconds(15));
});
```

正常运行 → `healthy`（200）。关闭期间 → 503。

## Kubernetes 就绪探针

```yaml
readinessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
```
