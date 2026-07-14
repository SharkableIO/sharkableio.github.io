# Lifecycle Hooks

Sharkable provides several hooks and services that run during application startup and shutdown, giving you fine-grained control over the application lifecycle.

## Startup Banner

When `UseShark()` completes, Sharkable prints a formatted banner to the console with version, environment, and UTC timestamp:

```
╔══════════════════════════════════════════════╗
║             Sharkable v0.5.7                 ║
║             Environment: Development          ║
║             Started at:  2026-07-15 12:34:56  ║
╚══════════════════════════════════════════════╝
```

The banner is always printed at the end of `UseShark()`, after all wiring, warmup, and validation complete.

## Application Lifecycle Hooks

Register callbacks that fire on `IHostApplicationLifetime` events:

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureOnStarted(sp =>
    {
        // Runs after app.Run() begins accepting requests
        var logger = sp.GetRequiredService<ILogger<Program>>();
        logger.LogInformation("Application started, ready to serve");
    });

    opt.ConfigureOnStopped(sp =>
    {
        // Runs on SIGTERM / graceful shutdown
        var logger = sp.GetRequiredService<ILogger<Program>>();
        logger.LogInformation("Application stopping");
    });
});
```

The `OnStarted` callback fires when `IHostApplicationLifetime.ApplicationStarted` is raised (after the server starts). The `OnStopped` callback fires on `ApplicationStopping` (during graceful shutdown). Both receive the root `IServiceProvider`.

## Warmup Service

Implement `IWarmupService` to run initialization logic synchronously during `UseShark()`, before the readiness gate opens:

```csharp
public class DatabaseWarmup : IWarmupService
{
    private readonly MyDbContext _db;

    public DatabaseWarmup(MyDbContext db)
    {
        _db = db;
    }

    public async Task WarmupAsync(CancellationToken cancellationToken)
    {
        // Run schema migrations, seed data, pre-compile queries
        await _db.Database.EnsureCreatedAsync(cancellationToken);
    }
}
```

Register the warmup service:

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureWarmup<DatabaseWarmup>();
});
```

Sharkable resolves the warmup service from DI, calls `WarmupAsync()` with a 30-second timeout, and opens the readiness gate only on success. Throw to fail startup.

## Eager Singleton

Mark a singleton service as `Eager = true` to have it resolved from DI during `UseShark()` rather than lazily on first access:

```csharp
[SingletonService(Eager = true)]
public interface ICacheWarmup
{
    void Preload();
}

public class CacheWarmup : ICacheWarmup
{
    public void Preload()
    {
        // Initialize cache, connect to remote services, etc.
    }
}
```

The service is resolved during startup, before the readiness gate opens and before the server accepts requests. This ensures eagerly-loaded singletons are fully initialized before traffic arrives.

## Pipeline Injection Points

Inject custom middleware at specific positions in Sharkable's pipeline using `UseSharkOptions`:

```csharp
app.UseShark(opt =>
{
    // Runs before authentication/authorization
    opt.AddBeforeAuth(app =>
    {
        app.Use(async (context, next) =>
        {
            // Custom pre-auth logic (request logging, header validation)
            await next(context);
        });
    });

    // Runs after authentication/authorization but before endpoints
    opt.AddAfterAuth(app =>
    {
        app.UseMiddleware<CustomTenantMiddleware>();
    });

    // Runs after all Sharkable endpoints are mapped
    opt.AddAfterEndpoints(app =>
    {
        app.MapFallback(() => Results.NotFound());
    });
});
```

Available injection points (in pipeline order):

| Point | Location | Use Case |
|-------|----------|----------|
| `AddBeforeAuth` | After CORS, before Authentication | Request logging, header validation |
| `AddAfterAuth` | After Authorization, before exception handler | Tenant resolution, culture setting |
| `AddAfterEndpoints` | After all endpoints mapped | Fallback routes, custom error pages |

## DI Validation

Validate critical service registrations at startup. If a service cannot be resolved, `UseShark()` throws immediately, preventing the server from starting with broken dependencies:

```csharp
builder.Services.AddShark(opt =>
{
    opt.ValidateOnStart<IMyService>();
    opt.ValidateOnStart<IOtherService>();
});
```

Each registered type is resolved via `GetRequiredService<T>()` during `UseShark()`, before the readiness gate opens. This provides fast feedback during development and prevents silent failures in production.
