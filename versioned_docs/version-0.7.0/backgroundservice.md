# BackgroundService

Sharkable provides `SharkBackgroundService` — an enhanced `BackgroundService` base class with built-in health reporting, retry policy, and execution tracing.

## Quick Start

```csharp
public class OrderCleanupJob : SharkBackgroundService
{
    public OrderCleanupJob() : base(interval: TimeSpan.FromHours(1)) { }

    protected override async Task OnExecuteAsync(CancellationToken ct)
    {
        // Your job logic here
    }
}

// Register in Program.cs:
builder.Services.AddHostedService<OrderCleanupJob>();
```

## Features

| Feature | Description |
|---------|-------------|
| **Health check** | Implements `IHealthCheck` — status auto-reported to `/healthz` |
| **Retry policy** | Max retries + delay between attempts (default: 3 retries, 5s delay) |
| **Execution tracing** | `LastRunAt`, `LastError`, `RunCount` tracked per instance |
| **Graceful stop** | `ExecuteAsync` respects `CancellationToken`, cancels retry delays on shutdown |

## Status

```csharp
public enum BackgroundServiceStatus
{
    Idle,     // waiting for next interval
    Running,  // currently executing
    Failed,   // all retries exhausted
    Stopped,  // shutdown complete
}
```

Status is exposed via `/healthz` when `EnableHealthChecks = true` — each background service registers as a separate health check entry.

## Configuration

```csharp
public class StockSyncJob : SharkBackgroundService
{
    public StockSyncJob()
        : base(interval: TimeSpan.FromMinutes(5),   // run every 5 min
               maxRetries: 2,                         // retry twice on failure
               retryDelay: TimeSpan.FromSeconds(10))  // 10s between retries
    { }
}
```

## AOT Support

Fully AOT-compatible. No reflection, no `dynamic`.
