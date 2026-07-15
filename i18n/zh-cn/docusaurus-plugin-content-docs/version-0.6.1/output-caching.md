---
title: 输出缓存
---

# 输出缓存

Sharkable 提供内置的输出缓存，提升响应速度并降低服务器负载。

## 快速开始

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

## 多策略

```csharp
opt.ConfigureOutputCache(c =>
{
    c.AddPolicy("short", b => b.Expire(TimeSpan.FromSeconds(30)));
    c.AddPolicy("medium", b => b.Expire(TimeSpan.FromMinutes(10)));
    c.AddPolicy("cache1h", b => b.Expire(TimeSpan.FromHours(1)));
});
```

## 按端点应用

通过 Sharkable DSL 在任意映射端点上应用策略：

```csharp
app.MapGet("products", () => GetProducts()).SharkCacheOutput("medium");
app.MapGet("config", () => GetConfig()).SharkCacheOutput("cache1h");
```

## AOT 兼容

输出缓存委托给 ASP.NET Core 的 `AddOutputCache()`，完全 AOT 兼容。
