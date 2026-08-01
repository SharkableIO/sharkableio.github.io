---
title: 跨域（CORS）
---

# 跨域（CORS）

Sharkable 提供内置的 CORS 配置。

## 快速开始

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureCors(c =>
    {
        c.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
    });
});
```

## 命名策略

```csharp
opt.ConfigureCors(c =>
{
    c.AddPolicy("AllowSpecific", p =>
    {
        p.WithOrigins("https://myapp.com")
         .AllowAnyMethod()
         .AllowAnyHeader();
    });

    c.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});
```

## 管道位置

CORS 在限流之后、认证之前插入中间件管道：

```
RateLimiter → OutputCache → CORS → Authentication → ...
```
