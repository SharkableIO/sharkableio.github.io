---
title: 性能面板
---

# 性能面板

Sharkable 提供内置的轻量级性能面板，位于 `/_sharkable/profiler`（可配置）。追踪请求数、平均延迟和最近最慢请求 TOP-N。

## 快速开始

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureProfiler(p => p.TopSlowRequests = 10);
});

var app = builder.Build();
app.UseShark();
```

访问 `/_sharkable/profiler`：
```json
{
  "uptime": "02:34:12",
  "totalRequests": 2847,
  "avgLatencyMs": 12.3,
  "topSlow": [
    {
      "method": "POST",
      "path": "/api/orders/create",
      "statusCode": 200,
      "elapsedMs": 234,
      "memoryDeltaBytes": 4096,
      "at": "2026-06-28T14:30:00.0000000+00:00"
    }
  ]
}
```

## 配置

```csharp
opt.ConfigureProfiler(p =>
{
    // 端点路径。默认："/_sharkable/profiler"
    p.Endpoint = "/_sharkable/profiler";

    // 追踪的最慢请求数。默认：20
    p.TopSlowRequests = 10;
});
```

## 追踪指标

| 指标 | 描述 |
|--------|-------------|
| `uptime` | 自第一次请求以来的运行时长 |
| `totalRequests` | 启动以来的总请求数 |
| `avgLatencyMs` | 平均响应时间（毫秒） |
| `topSlow` | 最近最慢的 N 个请求（最多缓冲 1000 条） |

每条慢请求包含：HTTP 方法、路径、状态码、耗时（ms）、内存变化（bytes）、时间戳。

## 性能

- 环形缓冲区限制 1000 条记录
- `ConcurrentQueue` 无锁读取
- 热路径零分配开销
- Profiler 端点自动从 OpenAPI/Scalar 文档中排除

## 访问控制

Profiler 端点默认**不受保护**。生产环境建议：

```csharp
if (app.Environment.IsDevelopment())
    opt.ConfigureProfiler(p => { });
```
