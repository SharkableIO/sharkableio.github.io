# Profiler Panel

Sharkable provides a built-in lightweight profiler panel at `/_sharkable/profiler` (configurable). Tracks request counts, average latency, and the top-N slowest recent requests.

## Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureProfiler(p => p.TopSlowRequests = 10);
});

var app = builder.Build();
app.UseShark();
```

Navigate to `/_sharkable/profiler`:
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

## Configuration

```csharp
opt.ConfigureProfiler(p =>
{
    // Endpoint path. Default: "/_sharkable/profiler"
    p.Endpoint = "/_sharkable/profiler";

    // Max slow requests to track. Default: 20
    p.TopSlowRequests = 10;

    // Max ring buffer entries. Default: 1000
    p.MaxEntries = 1000;
});
```

## Tracked Metrics

| Metric | Description |
|--------|-------------|
| `uptime` | Application uptime since first request |
| `totalRequests` | Total request count since startup |
| `avgLatencyMs` | Average response time in milliseconds |
| `topSlow` | Top-N slowest recent requests (up to 1000 buffered) |

Each slow request entry includes: HTTP method, path, status code, elapsed ms, memory delta (bytes), and timestamp.

## Performance

- Ring buffer limited to 1000 entries
- Lock-free reads via `ConcurrentQueue`
- Zero allocation overhead on the hot path
- Profiler endpoint auto-excluded from OpenAPI/Scalar docs

## Access Control

The profiler endpoint is **not protected** by default. In production, restrict access via middleware or environment checks:

```csharp
if (app.Environment.IsDevelopment())
    opt.ConfigureProfiler(p => { });
```
