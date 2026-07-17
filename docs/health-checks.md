# Health Checks

Sharkable maps a `/healthz` endpoint (configurable via `opt.HealthCheckPath = "/health"`) that returns a structured JSON health report via ASP.NET Core's `HealthCheckService`.

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

## NuGet Plugin Health Checks

Plugin health checks are opt-in. For example, `Sharkable.Cache.Redis` exposes `RedisHealthCheck` — but you must explicitly call `UseSharkableRedisHealthCheck()` to surface it on `/healthz` (SHARK-SEC-021). Simply calling `AddSharkableRedis` registers the implementation in DI without wiring it into the public health endpoint:

```csharp
// Step 1: register the Redis stores (idempotency, rate limiting, saga, cron)
services.AddSharkableRedis("localhost:6379");

// Step 2: opt in to surfacing the Redis health check on /healthz
services.UseSharkableRedisHealthCheck();
// Redis connectivity now appears in /healthz under name "redis", tag "ready"
```

Other plugins (e.g. `Sharkable.AutoCrud.SqlSugar`) register their `IHealthCheck` automatically and it surfaces once `services.AddHealthChecks()` is part of the host. Internally that looks like:

```csharp
// Inside a NuGet plugin extension method:
services.TryAddEnumerable(
    ServiceDescriptor.Singleton<IHealthCheck, SqlSugarHealthCheck>());
```

`HealthCheckService` auto-discovers all `IHealthCheck` registrations that have been wired into a health-check builder. If a plugin requires an explicit opt-in step, the plugin's docs will say so.

## Status Codes

| Overall Status | HTTP Code | When |
|---------------|-----------|------|
| `healthy` | 200 | All checks pass |
| `degraded` | 200 | Some checks degraded, none failing |
| `unhealthy` | 503 | At least one check failing, or shutting down |

## Detail Level

Control how much diagnostic detail `/healthz` exposes via `HealthCheckDetailLevel`:

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableHealthChecks = true;
    opt.HealthCheckDetailLevel = HealthCheckDetailLevel.StatusOnly;
});
```

| Level | Description |
|-------|-------------|
| `StatusOnly` (default in non-Dev) | Only the status (Healthy/Degraded/Unhealthy) — no descriptions, data, or exception messages. **Safe for production.** |
| `Description` | Status + check description text. |
| `Full` (default in Development) | Status + description + per-check data and exception messages. |

In Development mode, `Full` is the default for local debugging. In all other environments it defaults to `StatusOnly` — this prevents `/healthz` from leaking database server addresses, connection-string fragments, and exception details to anonymous callers.

## Readiness Gate

During startup, `/healthz` returns 503 with `"startup"` check until `UseShark()` completes all wiring (middleware, endpoints, warmup, eager singletons, DI validation):

```json
{
  "status": "unhealthy",
  "checks": {
    "startup": {
      "status": "unhealthy",
      "description": "Startup not complete"
    }
  },
  "uptime": "00:00:00",
  "version": "0.6.0"
}
```

Once `UseShark()` finishes, the readiness gate opens and `/healthz` begins returning actual health check results. This ensures Kubernetes `readinessProbe` does not route traffic before the application is fully initialized.

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

## Liveness Probe

Sharkable maps a `/livez` endpoint alongside `/healthz` that always returns `{"status":"alive"}` with HTTP 200 — regardless of health check state, readiness gate, or graceful shutdown:

```json
{
  "status": "alive"
}
```

Use `/livez` for Kubernetes `livenessProbe` to distinguish a hung process from a merely unhealthy one:

```yaml
livenessProbe:
  httpGet:
    path: /livez
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10
```

The liveness probe is enabled automatically when `EnableHealthChecks` is `true`.

## Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /livez
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
```
