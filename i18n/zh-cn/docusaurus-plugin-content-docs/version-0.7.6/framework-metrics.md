# 框架指标

Sharkable 基于 `System.Diagnostics.Metrics` 提供内置计数器。零外部依赖，完全 AOT 兼容，配置 OpenTelemetry 导出器后自动流入。

## 快速开始

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureMetrics(m => m.Enabled = true);
});
```

默认禁用。启用后创建 `Meter("Sharkable")`，包含以下计数器。

## 计数器

| 计数器 | 说明 |
|---|---|
| `sharkable.requests` | 管道处理的总请求数 |
| `sharkable.ratelimit.rejected` | 被分布式限流拒绝的请求 |
| `sharkable.idempotency.hit` | 幂等缓存命中（重放响应） |
| `sharkable.idempotency.miss` | 幂等缓存未命中（新请求） |
| `sharkable.idempotency.conflict` | 幂等键冲突（同 key 不同 payload） |
| `sharkable.auth.failures` | 认证/授权失败 |
| `sharkable.audit.dropped` | 因通道溢出丢弃的审计日志 |
| `sharkable.cron.runs` | 定时任务执行次数 |
| `sharkable.cron.failures` | 定时任务执行失败次数 |
| `sharkable.saga.completed` | 成功完成的事务 |
| `sharkable.saga.compensated` | 补偿（回滚）的事务 |

## 自定义指标

通过工厂模式替换整个指标实现：

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureMetrics(m => m.Enabled = true);
    opt.MetricsFactory = sp => new PrometheusSharkMetrics();
});
```

## OpenTelemetry 集成

```bash
dotnet add package OpenTelemetry.Exporter.Prometheus.AspNetCore
```

```csharp
builder.Services.AddOpenTelemetry()
    .WithMetrics(m => m
        .AddMeter("Sharkable")
        .AddPrometheusExporter());
```

## AOT

完全 AOT 兼容。
