# Health Checks

Sharkable maps a `/healthz` endpoint that returns a structured JSON health report via ASP.NET Core's `HealthCheckService`.

## Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableHealthChecks = true;
});
```

`GET /healthz`:
```json
{
  "status": "healthy",
  "checks": {},
  "uptime": "02:34:12",
  "version": "0.4.0"
}
```

## Custom Checks

Register custom health checks via `HealthChecksConfigure`:

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

Response with checks:
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

## Auto Checks

When JWT is configured, a JWT authority reachability check is automatically registered:

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableHealthChecks = true;
    opt.ConfigureJwt("https://auth.example.com", ["my-api"]);
    // JWT check automatically added
});
```

Additional auto-checks can be added via NuGet plugins (e.g., `Sharkable.AutoCrud.SqlSugar` adds database connectivity).

## Status Codes

| Overall Status | HTTP Code | When |
|---------------|-----------|------|
| `healthy` | 200 | All checks pass |
| `degraded` | 200 | Some checks degraded, none failing |
| `unhealthy` | 503 | At least one check failing, or shutting down |

## Graceful Shutdown Integration

When [Graceful Shutdown](graceful-shutdown) is configured, `/healthz` returns 503 during shutdown:

```json
{
  "status": "unhealthy",
  "checks": {
    "shutdown": {
      "status": "unhealthy",
      "message": "Server is shutting down"
    }
  },
  "uptime": "18:42:07",
  "version": "0.4.0"
}
```

## Kubernetes Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
```
