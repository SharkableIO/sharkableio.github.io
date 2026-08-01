# Framework Metrics

Sharkable provides built-in counters powered by `System.Diagnostics.Metrics`. Zero external dependencies, fully AOT-compatible, and automatically flows into OpenTelemetry when exporters are configured.

## Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureMetrics(m => m.Enabled = true);
});
```

This creates a `Meter("Sharkable")` with the following counters. Disabled by default.

## Counters

| Counter | Description |
|---|---|
| `sharkable.requests` | Total requests processed by the pipeline |
| `sharkable.ratelimit.rejected` | Requests rejected by the distributed rate limiter |
| `sharkable.idempotency.hit` | Idempotency-key cache hits (replayed responses) |
| `sharkable.idempotency.miss` | Idempotency-key cache misses (new requests) |
| `sharkable.idempotency.conflict` | Idempotency-key conflicts (different payload, same key) |
| `sharkable.auth.failures` | Authentication/authorization failures |
| `sharkable.audit.dropped` | Audit log entries dropped due to channel overflow |
| `sharkable.cron.runs` | Cron job executions |
| `sharkable.cron.failures` | Failed cron job executions |
| `sharkable.saga.completed` | Successfully completed saga transactions |
| `sharkable.saga.compensated` | Compensated (rolled back) saga transactions |

## Configuration

```csharp
opt.ConfigureMetrics(m =>
{
    m.Enabled = true;
    m.MeterName = "MyApp";         // default: "Sharkable"
    m.MeterVersion = "2.0";        // default: "1.0"
});
```

## Custom Metrics

Replace the entire metrics implementation via the factory pattern:

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureMetrics(m => m.Enabled = true);
    opt.MetricsFactory = sp => new PrometheusSharkMetrics();
});

// Custom implementation
public sealed class PrometheusSharkMetrics : ISharkMetrics
{
    public Counter<long> Requests { get; }
    public Counter<long> RateLimitRejected { get; }
    // ... implement all ISharkMetrics counters
}
```

Your custom implementation receives the same `MeterName`/`MeterVersion` from `MetricsOptions`.

## Integration with OpenTelemetry

Add the OpenTelemetry exporter to your project:

```bash
dotnet add package OpenTelemetry.Exporter.Prometheus.AspNetCore
```

```csharp
builder.Services.AddOpenTelemetry()
    .WithMetrics(m => m
        .AddMeter("Sharkable")   // match your MetricsOptions.MeterName
        .AddPrometheusExporter());
```

All Sharkable counters flow into your metrics backend automatically — no code changes needed in your endpoints.

## AOT

Fully AOT-compatible. `System.Diagnostics.Metrics` is a first-class .NET API with no reflection.
