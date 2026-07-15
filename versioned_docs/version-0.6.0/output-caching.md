# Output Caching

Sharkable provides built-in output caching to improve response times and reduce server load.

## Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureOutputCache(c =>
    {
        c.AddPolicy("cache1h", b => b.Expire(TimeSpan.FromHours(1)));
    });
});

var app = builder.Build();
app.UseShark();

app.MapGet("hello", () => "hi").SharkCacheOutput("cache1h");
```

## Multiple Policies

```csharp
opt.ConfigureOutputCache(c =>
{
    c.AddPolicy("short", b => b.Expire(TimeSpan.FromSeconds(30)));
    c.AddPolicy("medium", b => b.Expire(TimeSpan.FromMinutes(10)));
    c.AddPolicy("cache1h", b => b.Expire(TimeSpan.FromHours(1)));
});
```

## Per-Endpoint Application

Apply policies via the Sharkable DSL on any mapped endpoint:

```csharp
app.MapGet("products", () => GetProducts()).SharkCacheOutput("medium");
app.MapGet("config", () => GetConfig()).SharkCacheOutput("cache1h");
```

## AOT Compatibility

Output caching delegates to ASP.NET Core's `AddOutputCache()` and is fully AOT-compatible.
