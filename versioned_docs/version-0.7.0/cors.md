# CORS

Sharkable provides built-in CORS configuration.

## Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureCors(c =>
    {
        c.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
    });
});
```

## Named Policies

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

## Pipeline Position

CORS is wired in the middleware pipeline after rate limiting and before authentication:

```
RateLimiter → OutputCache → CORS → Authentication → ...
```
