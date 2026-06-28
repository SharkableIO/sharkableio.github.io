# Health Checks

Sharkable maps a `/healthz` endpoint that returns the application health status.

## Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableHealthChecks = true;
});
```

The `/healthz` endpoint returns:

```
HTTP 200 OK
Content-Type: text/plain
healthy
```

## Graceful Shutdown Integration

When [Graceful Shutdown](graceful-shutdown) is configured, the health check automatically returns 503 during shutdown. This signals load balancers and Kubernetes to stop routing traffic to the instance:

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableHealthChecks = true;
    opt.ConfigureGracefulShutdown(g => g.DrainTimeout = TimeSpan.FromSeconds(15));
});
```

During normal operation → `healthy` (200). During shutdown → 503.

## Kubernetes Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
```
