---
title: 后台服务
---

# 后台服务

Sharkable 提供 `SharkBackgroundService` — 增强的 `BackgroundService` 基类，内置健康上报、重试策略和执行追踪。

## 快速开始

```csharp
public class OrderCleanupJob : SharkBackgroundService
{
    public OrderCleanupJob() : base(interval: TimeSpan.FromHours(1)) { }

    protected override async Task OnExecuteAsync(CancellationToken ct)
    {
        // 你的任务逻辑
    }
}

// 在 Program.cs 注册：
builder.Services.AddHostedService<OrderCleanupJob>();
```

## 特性

| 特性 | 说明 |
|------|------|
| **健康检查** | 实现 `IHealthCheck` — 状态自动上报 `/healthz` |
| **重试策略** | 最大重试次数 + 重试间隔（默认：3 次，5 秒延迟） |
| **执行追踪** | 每个实例跟踪 `LastRunAt`、`LastError`、`RunCount` |
| **优雅停止** | `ExecuteAsync` 响应 `CancellationToken`，关闭时取消重试延迟 |

## 状态

```csharp
public enum BackgroundServiceStatus
{
    Idle,     // 等待下次执行
    Running,  // 执行中
    Failed,   // 重试全部失败
    Stopped,  // 关闭完成
}
```

启用 `EnableHealthChecks = true` 时，每个后台服务注册为一个独立的健康检查项。

## 配置

```csharp
public class StockSyncJob : SharkBackgroundService
{
    public StockSyncJob()
        : base(interval: TimeSpan.FromMinutes(5),     // 每 5 分钟
               maxRetries: 2,                           // 失败重试 2 次
               retryDelay: TimeSpan.FromSeconds(10))    // 重试间隔 10s
    { }
}
```
