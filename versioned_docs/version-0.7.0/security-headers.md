# Security Headers

Sharkable provides an opt-in middleware that adds standard security HTTP response headers. All headers are disabled by default — you choose which ones to enable.

## Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureSecurityHeaders(h =>
    {
        h.ContentTypeOptions = true;
        h.FrameOptions = "DENY";
        h.ReferrerPolicy = "no-referrer";
        h.StrictTransportSecurity = true;
    });
});

var app = builder.Build();
app.UseShark();
```

This adds `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and `Strict-Transport-Security: max-age=31536000` to every response.

## Configuration

```csharp
opt.ConfigureSecurityHeaders(h =>
{
    h.ContentTypeOptions = true;
    h.FrameOptions = "DENY";
    h.ReferrerPolicy = "strict-origin-when-cross-origin";
    h.ContentSecurityPolicy = "default-src 'none'";
    h.PermissionsPolicy = "geolocation=()";
    h.StrictTransportSecurity = true;
    h.HstsMaxAge = 63072000;
    h.CrossOriginResourcePolicy = "same-origin";
    h.CrossOriginOpenerPolicy = "same-origin";
    h.CrossOriginEmbedderPolicy = "require-corp";
    h.ExcludePaths = ["/healthz", "/openapi"];
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `ContentTypeOptions` | `bool` | `false` | Adds `X-Content-Type-Options: nosniff` |
| `FrameOptions` | `string?` | `null` | `X-Frame-Options` value (e.g. `"DENY"`, `"SAMEORIGIN"`) |
| `ReferrerPolicy` | `string?` | `null` | `Referrer-Policy` value |
| `ContentSecurityPolicy` | `string?` | `null` | `Content-Security-Policy` value |
| `PermissionsPolicy` | `string?` | `null` | `Permissions-Policy` value |
| `StrictTransportSecurity` | `bool` | `false` | Adds HSTS with configurable `max-age` |
| `HstsMaxAge` | `int` | `31536000` | HSTS max-age in seconds (1 year) |
| `CrossOriginResourcePolicy` | `string?` | `null` | `Cross-Origin-Resource-Policy` value |
| `CrossOriginOpenerPolicy` | `string?` | `null` | `Cross-Origin-Opener-Policy` value |
| `CrossOriginEmbedderPolicy` | `string?` | `null` | `Cross-Origin-Embedder-Policy` value |
| `ExcludePaths` | `string[]` | `[]` | Path prefixes to skip (e.g. `"/healthz"`) |

## How It Works

Headers are registered via `context.Response.OnStarting()` — they are added just before the first byte is written, so they appear on all responses including error responses. The middleware runs early in the pipeline (after response compression, before graceful shutdown).

## AOT

Fully AOT-compatible. No reflection used.

## Security

All user-supplied header values are validated at startup against CR/LF/NUL characters to prevent header injection attacks. Values containing these characters produce a startup error via `ConfigurationValidator`.
