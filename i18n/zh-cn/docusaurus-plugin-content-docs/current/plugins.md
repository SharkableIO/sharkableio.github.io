# 插件系统

Sharkable 提供了一套插件系统，允许第三方开发者以 NuGet 包或热插拔文件夹的形式发布功能。插件在启动时自动集成——无需手动配置。

## 快速开始

实现 `ISharkPlugin` 接口，放到你的项目中：

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
        // 在此添加中间件或映射端点
    }

    public void ConfigureOpenApi(OpenApiOptions openApiOptions, SharkOption option)
    {
        // 在此添加 OpenAPI schema 或 transformer
    }
}
```

```csharp
// Program.cs — 插件从项目程序集中自动发现
builder.Services.AddShark();
```

## 生命周期钩子

插件在应用生命周期的不同阶段接收三个回调：

| 钩子 | 时机 | 用途 |
|---|---|---|
| `ConfigureServices` | `AddShark()` | 注册 DI 服务、Store、选项。使用 `TryAdd*` 以便宿主配置优先 |
| `ConfigurePipeline` | `UseShark()` | 添加中间件、映射端点、配置请求管道 |
| `ConfigureOpenApi` | OpenAPI 初始化 | 添加 schema、transformer。仅在 `UseOpenApi` 为 `true` 时调用 |

## 发现路径

插件通过三条路径被发现，按顺序尝试。同名插件（按 `Name`）会被跳过并记录警告——先注册者胜。

### 1. 程序集扫描（默认，JIT + AOT 均支持）

启动时扫描 Sharkable 已知的所有程序集，寻找 `ISharkPlugin` 实现。NuGet 包和项目程序集自动包含。

```csharp
// 自动发现所有引用程序集中的 ISharkPlugin
builder.Services.AddShark();

// 禁用自动发现
builder.Services.AddShark(opt =>
{
    opt.AutoDiscoverPlugins = false;
});
```

### 2. 热插拔文件夹（仅 JIT，需主动开启）

将插件文件夹放入配置目录，重启即可生效——无需重新编译。每个子文件夹是一个独立插件，包含自己的依赖。

```
./plugins/                        (可配置)
  ├── MyAuthPlugin/
  │   ├── MyAuthPlugin.dll        ← 包含 ISharkPlugin 实现
  │   ├── MyAuthPlugin.deps.json
  │   └── BouncyCastle.dll        ← 插件自己的依赖
  └── MyLogPlugin/
      ├── MyLogPlugin.dll
      └── Serilog.Sinks.File.dll
```

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigurePlugins(p =>
    {
        p.Directory = "./plugins";    // 默认
        p.ScanOnStartup = true;       // 主动开启
    });
});
```

每个子文件夹拥有独立的 `AssemblyLoadContext`——不共享依赖，不产生版本冲突。

:::warning AOT
文件夹扫描依赖 `AssemblyLoadContext`，需要 JIT 运行时。AOT 模式下此路径会以启动错误形式禁用。在 AOT 中使用程序集扫描或 `RegisterPlugin()`。
:::

### 3. 手动注册（JIT + AOT 均支持）

显式注册插件——适用于 AOT 模式或按条件加载的插件。

```csharp
builder.Services.AddShark(opt =>
{
    opt.RegisterPlugin(new MyPlugin());
});
```

## 禁用插件

通过名称禁用任意插件，不限发现路径：

```csharp
builder.Services.AddShark(opt =>
{
    opt.DisablePlugin("Sharkable.Cache.Redis");
});
```

## 插件开发清单

发布 Sharkable 插件包时：

1. 引用 `Sharkable` 作为 NuGet 依赖（获取 `ISharkPlugin` 接口）
2. 在 `public sealed` 类中实现 `ISharkPlugin`，提供无参构造函数
3. 给插件一个唯一的 `Name`——命名规范：`"<组织>.<功能>"`（如 `"Acme.Audit"`）
4. 在 `ConfigureServices` 中使用 `TryAddSingleton` / `TryAddScoped`——永不覆盖宿主注册
5. 热插拔部署时，以 class library 形式发布，包含 `.deps.json`

## 示例：Redis 缓存插件

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

宿主应用——零配置：

```csharp
// 仅引用 NuGet 包——插件自动发现
builder.Services.AddShark();
```
