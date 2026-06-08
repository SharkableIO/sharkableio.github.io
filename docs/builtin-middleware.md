# Built-in Middleware

Sharkable provides built-in integration for several ASP.NET Core middleware features:

- [Rate Limiting](#rate-limiting)
- [Output Caching](#output-caching)
- [Health Checks](#health-checks)
- [CORS](#cors)
- [API Key Authentication](#api-key-authentication)
- [JWT Bearer Authentication](#jwt-bearer-authentication)

## Rate Limiting

Configure rate limiting policies and apply them per-endpoint.

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

## Output Caching

Configure output caching policies and apply them per-endpoint.

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

## Health Checks

Enable the `/healthz` endpoint.

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableHealthChecks = true;
});
```

The health check returns `text/plain` response `healthy` with status 200.

## CORS

Configure CORS policies.

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureCors(c =>
    {
        c.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
    });
});
```

## API Key Authentication

Protect all endpoints with an API key. Requests must include a valid `X-Api-Key` header.

```csharp
builder.Services.AddShark(opt =>
{
    opt.ApiKeys = ["your-secret-key-here"];
});
```

## JWT Bearer Authentication

Configure JWT authentication with opinionated defaults. Auth failures return UnifiedResult format.

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureJwt(
        authority: "https://your-issuer.com",
        audiences: ["your-api"],
        configure: jwt =>
        {
            // optional additional configuration
        }
    );
});
```
