# Plugin System

Sharkable provides a plugin system that lets third-party developers ship features as NuGet packages or hot-plug folders. Plugins auto-integrate at startup — no manual wiring required.

## Quick Start

Implement `ISharkPlugin` and place it in your project:

```csharp
using Sharkable;

public sealed class MyPlugin : ISharkPlugin
{
    public string Name => "MyPlugin";

    public void ConfigureServices(IServiceCollection services, SharkOption option)
    {
        services.TryAddSingleton<IMyService, MyService>();
    }

    public void ConfigurePipeline(WebApplication app, SharkOption option)
    {
        // Add middleware or map endpoints here
    }

    public void ConfigureOpenApi(OpenApiOptions openApiOptions, SharkOption option)
    {
        // Add OpenAPI schemas or transformers here
    }
}
```

```csharp
// Program.cs — plugin auto-discovered from the project assembly
builder.Services.AddShark();
```

## Lifecycle Hooks

Plugins receive three callbacks at different stages of the application lifecycle:

| Hook | When | What to do |
|---|---|---|
| `ConfigureServices` | `AddShark()` | Register DI services, stores, options. Use `TryAdd*` so the host wins on conflicts. |
| `ConfigurePipeline` | `UseShark()` | Add middleware, map endpoints, configure the request pipeline. |
| `ConfigureOpenApi` | OpenAPI setup | Add schemas, operation transformers, document transformers. Only called when `UseOpenApi` is `true`. |

## Discovery Paths

Plugins are discovered through three paths, tried in order. Duplicates (by `Name`) are skipped with a warning — first registration wins.

### 1. Assembly Scanning (default, JIT + AOT)

All assemblies known to Sharkable are scanned for `ISharkPlugin` implementations at startup. NuGet packages and project assemblies are included automatically.

```csharp
// Automatically discovers all ISharkPlugin in referenced assemblies
builder.Services.AddShark();

// Disable auto-discovery
builder.Services.AddShark(opt =>
{
    opt.AutoDiscoverPlugins = false;
});
```

### 2. Hot-Plug Folder (JIT only, opt-in)

Drop a plugin folder into the configured directory and restart — no recompile needed. Each subfolder is an independent plugin with its own dependencies.

```
./plugins/                        (configurable)
  ├── MyAuthPlugin/
  │   ├── MyAuthPlugin.dll        ← contains ISharkPlugin impl
  │   ├── MyAuthPlugin.deps.json
  │   └── BouncyCastle.dll        ← plugin's own dependency
  └── MyLogPlugin/
      ├── MyLogPlugin.dll
      └── Serilog.Sinks.File.dll
```

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigurePlugins(p =>
    {
        p.Directory = "./plugins";    // default
        p.ScanOnStartup = true;       // opt-in
    });
});
```

Each subfolder gets its own `AssemblyLoadContext` — no shared dependencies, no version conflicts.

:::warning AOT
Folder scanning uses `AssemblyLoadContext` and requires a JIT runtime. In AOT mode, this path is disabled with a startup error. Use assembly scanning or `RegisterPlugin()` in AOT.
:::

### 3. Manual Registration (JIT + AOT)

Explicitly register plugins — useful in AOT mode or for runtime-conditional plugins.

```csharp
builder.Services.AddShark(opt =>
{
    opt.RegisterPlugin(new MyPlugin());
});
```

## Opt-Out

Disable any plugin by name, regardless of discovery path:

```csharp
builder.Services.AddShark(opt =>
{
    opt.DisablePlugin("Sharkable.Cache.Redis");
});
```

## Plugin Author Checklist

When publishing a Sharkable plugin package:

1. Reference `Sharkable` as a NuGet dependency (for `ISharkPlugin` interface)
2. Implement `ISharkPlugin` in a `public sealed` class with a parameterless constructor
3. Give the plugin a unique `Name` — convention: `"<Org>.<Feature>"` (e.g. `"Acme.Audit"`)
4. Use `TryAddSingleton` / `TryAddScoped` in `ConfigureServices` — never overwrite host registrations
5. For hot-plug deployment, publish as a class library with `.deps.json`

## Example: Redis Cache Plugin

```csharp
namespace Sharkable.Cache.Redis;

public sealed class RedisCachePlugin : ISharkPlugin
{
    public string Name => "Sharkable.Cache.Redis";

    public void ConfigureServices(IServiceCollection services, SharkOption option)
    {
        services.TryAddSingleton<IDistributedRateLimitStore, RedisRateLimitStore>();
        services.TryAddSingleton<IIdempotencyStore, RedisIdempotencyStore>();
        services.TryAddSingleton<ISagaStore, RedisSagaStore>();
        services.TryAddSingleton<ICronJobStore, RedisCronJobStore>();

        if (option.EnableHealthChecks)
            services.AddHealthChecks().AddCheck<RedisHealthCheck>("redis");
    }

    public void ConfigurePipeline(WebApplication app, SharkOption option) { }

    public void ConfigureOpenApi(OpenApiOptions openApiOptions, SharkOption option) { }
}
```

Host application — zero-config:

```csharp
// Just reference the NuGet package — plugin auto-discovered
builder.Services.AddShark();
```
