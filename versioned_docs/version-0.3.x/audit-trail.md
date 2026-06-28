# Audit Trail / Request Logging

Sharkable provides a structured request/response logging middleware that automatically logs every request with timing, status, and correlation ID.

## Quick Start

Enable audit trail in `AddShark()`:

```csharp
builder.Services.AddShark([typeof(Program).Assembly], opt =>
{
    opt.ConfigureAuditTrail();
});

var app = builder.Build();
app.UseShark();
```

Each request produces a structured log entry:

```
HTTP GET /api/users responded 200 in 45ms [CorrelationId: a1b2c3d4e5f6...]
```

A `X-Correlation-Id` header is added to every response.

## Configuration

```csharp
opt.ConfigureAuditTrail(a =>
{
    // Log levels by status code range
    a.SuccessLogLevel = LogLevel.Information;  // < 400
    a.WarningLogLevel = LogLevel.Warning;       // 400-499
    a.ErrorLogLevel = LogLevel.Error;           // >= 500

    // Skip health checks, OpenAPI, etc.
    a.ExcludePaths = ["/healthz", "/openapi", "/scalar"];

    // Redact sensitive headers
    a.RedactHeaders = ["Authorization", "X-Api-Key", "Cookie"];

    // Redact sensitive query parameters
    a.RedactQueryParams = ["token", "api_key", "secret"];

    // Include query string in log (default: true)
    a.IncludeQueryString = true;

    // Correlation ID header name (default: X-Correlation-Id)
    a.CorrelationIdHeader = "X-Correlation-Id";

    // Forward incoming correlation ID (default: true)
    a.ForwardCorrelationId = true;
});
```

## Correlation ID

A `X-Correlation-Id` header is set on every response:

- **Forwarded**: If the incoming request already carries `X-Correlation-Id`, that value is reused
- **Generated**: Otherwise, a new UUID is created
- **Unique per request**: Each request gets its own correlation ID

This makes it easy to trace requests across services and correlate logs.

## Response Header

Every audited response includes the `X-Correlation-Id` header:

```
HTTP/1.1 200 OK
X-Correlation-Id: a1b2c3d4e5f67890abcdef1234567890
Content-Type: application/json
```

Requests to excluded paths do **not** get the `X-Correlation-Id` header.

## AOT Compatibility

The audit trail middleware is fully AOT-compatible. It uses `ILogger<T>` for structured logging with zero reflection on request/response bodies.
