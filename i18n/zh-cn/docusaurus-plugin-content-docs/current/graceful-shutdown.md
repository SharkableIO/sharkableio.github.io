---
title: 优雅关闭
---

# 优雅关闭

Sharkable 提供优雅关闭中间件，在停止服务前排空进行中的请求，确保零停机部署。

## 快速开始

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureGracefulShutdown(g => g.DrainTimeout = TimeSpan.FromSeconds(15));
});

var app = builder.Build();
app.UseShark();
```

## 行为

收到关闭信号（SIGTERM / `IHostApplicationLifetime.ApplicationStopping`）时：

1. **健康检查标记为不健康** — `/healthz` 返回 503，通知负载均衡器移除该实例
2. **拒绝新请求** — 新请求立即收到 503 响应
3. **排空进行中的请求** — 中间件等待活动请求完成，最多等待 `DrainTimeout`

### 503 响应

```json
{
  "statusCode": 503,
  "errorMessage": "Server is shutting down"
}
```

## 配置

```csharp
opt.ConfigureGracefulShutdown(g =>
{
    // 等待进行中请求的最大时长。默认 30s。
    g.DrainTimeout = TimeSpan.FromSeconds(15);

    // 关闭期间返回的 HTTP 状态码。默认 503。
    g.ShutdownStatusCode = 503;

    // 排空轮询间隔。默认 100ms。
    g.DrainPollingInterval = TimeSpan.FromMilliseconds(100);
});
```

## 管道位置

优雅关闭中间件插入管道头部（在限流、认证等之前），以尽快拒绝新请求，同时让已有请求继续处理。

## K8s / 负载均衡器集成

配合 Kubernetes 时，`terminationGracePeriodSeconds` 应大于 `DrainTimeout` + 缓冲：

```yaml
# pod 配置
terminationGracePeriodSeconds: 45  # > DrainTimeout + 缓冲

# 就绪探针
readinessProbe:
  httpGet:
    path: /healthz
    port: 8080
```

滚动更新流程：
1. K8s 向 Pod 发送 SIGTERM
2. `/healthz` 返回 503 → Pod 从 Service Endpoints 中移除
3. 进行中的请求排空（最长 `DrainTimeout`）
4. Pod 退出

## 健康检查集成

启用优雅关闭后，`/healthz` 在关闭期间自动返回 503，无需额外配置：

```csharp
opt.EnableHealthChecks = true;
```
