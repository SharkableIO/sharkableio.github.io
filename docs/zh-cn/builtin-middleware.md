# 内置中间件

Sharkable 为多个 ASP.NET Core 中间件功能提供了内置集成：

- [限流](#限流)
- [输出缓存](#输出缓存)
- [健康检查](#健康检查)
- [CORS](#cors)
- [API 密钥认证](#api-密钥认证)
- [JWT Bearer 认证](#jwt-bearer-认证)

## 限流

配置限流策略并应用到端点。

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureRateLimiter(r =>
    {
        r.AddFixedWindowLimiter("fixed", o =>
        {
            o.PermitLimit = 10;
            o.Window = TimeSpan.FromSeconds(1);
        });
    });
});

var app = builder.Build();
app.UseShark();

app.MapGet("hello", () => "hi").SharkRequireRateLimiting("fixed");
```

## 输出缓存

配置输出缓存策略并应用到端点。

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

## 健康检查

启用 `/healthz` 端点。

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableHealthChecks = true;
});
```

健康检查返回 `text/plain` 响应 `healthy`，状态码 200。

## CORS

配置 CORS 策略。

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureCors(c =>
    {
        c.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
    });
});
```

## API 密钥认证

用 API 密钥保护所有端点。请求必须包含有效的 `X-Api-Key` 头。

```csharp
builder.Services.AddShark(opt =>
{
    opt.ApiKeys = ["your-secret-key-here"];
});
```

## JWT Bearer 认证

配置 JWT 认证，带有预设的最佳实践。认证失败返回 UnifiedResult 格式。

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureJwt(
        authority: "https://your-issuer.com",
        audiences: ["your-api"],
        configure: jwt =>
        {
            // 可选的额外配置
        }
    );
});
```
