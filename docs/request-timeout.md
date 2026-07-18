# Request Timeout

Thin wrapper over ASP.NET Core's built-in `AddRequestTimeouts`. Sharkable automatically registers the service and wires the middleware.

## Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.RequestTimeoutsConfigure = o =>
    {
        o.AddPolicy("api", TimeSpan.FromSeconds(30));
        o.AddPolicy("longrunning", TimeSpan.FromMinutes(5));
        o.DefaultPolicy = "api";
    };
    opt.DefaultRequestTimeoutPolicy = "api";
});
```

Apply per-endpoint:

```csharp
app.MapPost("/upload", HandleUpload)
   .SharkRequestTimeout("longrunning");
```

## Per-Endpoint DSL

```csharp
// Apply a named timeout policy
app.MapGet("/fast", () => "ok")
   .SharkRequestTimeout("api");

// No timeout specified → falls back to DefaultRequestTimeoutPolicy
app.MapGet("/default", () => "ok");
```

## Configuration

| Property | Type | Description |
|---|---|---|
| `RequestTimeoutsConfigure` | `Action<RequestTimeoutOptions>?` | ASP.NET Core timeout policies |
| `DefaultRequestTimeoutPolicy` | `string?` | Fallback policy name for endpoints without `.SharkRequestTimeout()` |

Sharkable calls `services.AddRequestTimeouts()` and `app.UseRequestTimeouts()` automatically when `RequestTimeoutsConfigure` is set.

## AOT

Fully AOT-compatible — delegates to built-in ASP.NET Core APIs, no reflection.
