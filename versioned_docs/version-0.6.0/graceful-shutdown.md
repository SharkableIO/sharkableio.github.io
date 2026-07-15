# Graceful Shutdown

Sharkable provides a graceful shutdown middleware that ensures zero-downtime deployments by draining in-flight requests before stopping.

## Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureGracefulShutdown(g => g.DrainTimeout = TimeSpan.FromSeconds(15));
});

var app = builder.Build();
app.UseShark();
```

## Behavior

When the application receives a shutdown signal (SIGTERM / `IHostApplicationLifetime.ApplicationStopping`):

1. **Health check goes unhealthy** — `/healthz` returns 503, signaling the load balancer to remove this instance
2. **New requests are rejected** — new requests get an immediate 503 response
3. **In-flight requests drain** — the middleware waits up to `DrainTimeout` for active requests to complete

### 503 Response

```json
{
  "statusCode": 503,
  "errorMessage": "Server is shutting down"
}
```

## Configuration

```csharp
opt.ConfigureGracefulShutdown(g =>
{
    // Maximum time to wait for in-flight requests. Default: 30s.
    g.DrainTimeout = TimeSpan.FromSeconds(15);

    // HTTP status code returned during shutdown. Default: 503.
    g.ShutdownStatusCode = 503;

    // Polling interval for drain loop. Default: 100ms.
    g.DrainPollingInterval = TimeSpan.FromMilliseconds(100);
});
```

## Middleware Pipeline Position

The graceful shutdown middleware is injected **early** in the pipeline (before rate limiting, authentication, etc.) so that new requests are rejected as soon as possible while existing requests continue processing.

## Kubernetes/Load Balancer Integration

For Kubernetes, combine with a `terminationGracePeriodSeconds` that exceeds `DrainTimeout` + buffer:

```yaml
# pod spec
terminationGracePeriodSeconds: 45  # > DrainTimeout + buffer

# readiness probe
readinessProbe:
  httpGet:
    path: /healthz
    port: 8080
```

The sequence during a rollout:
1. K8s sends SIGTERM to the pod
2. Health check returns 503 → pod removed from service endpoints
3. In-flight requests drain for up to `DrainTimeout`
4. Pod exits

## Health Check Integration

When graceful shutdown is enabled, the `/healthz` endpoint automatically returns 503 during shutdown. No additional configuration is needed — just enable health checks:

```csharp
opt.EnableHealthChecks = true;
```
