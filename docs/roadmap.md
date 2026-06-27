# Roadmap

Candidate features. All entries are constrained: **zero new third-party NuGet packages** — only the existing 4 packages (FluentValidation / Microsoft.AspNetCore.OpenApi / Scalar.AspNetCore / Microsoft.AspNetCore.Authentication.JwtBearer) + the `Microsoft.AspNetCore.App` framework reference.

## Implemented

| # | Feature | Notes |
|---|---|---|
| 3 | Idempotency middleware | Pure code, `IMemoryCache` / `OutputCache` |
| 6 | Structured logging + field redaction | `ILogger` + custom `RedactingFormatter` |
| 8 | Multi-tenant | `IHttpContextAccessor` + abstraction, pure code |

## Pending (zero-dependency, doable)

| # | Feature | Notes |
|---|---|---|
| 4 | Pagination / filtering / sorting DTO | Pure POCO, zero-cost with AutoCrud |
| 5 | Response compression | `Microsoft.AspNetCore.ResponseCompression` already in framework reference |
| 9 | Lightweight feature flags | Config-driven, no `Microsoft.FeatureManagement` |
| 10 | Webhook outbound + HMAC signing | `System.Security.Cryptography`, zero dependency |
| 13 | Scalar enhancements | Already have Scalar, add example / auth UI config |
| 15 | Integration test base class | `WebApplicationFactory<>` in `Microsoft.AspNetCore.TestHost` |
| 16 | Correlation ID | Pure middleware |
| 17 | ETag / 304 conditional requests | `Microsoft.Net.Http.Headers.ETag` built-in |
| 18 | ProblemDetails normalization | ASP.NET Core 9+ built-in `IProblemDetailsService` |
| 19 | Soft-delete global filter | AutoCrud internal, pure expression tree |
| 20 | `SharkBackgroundService` abstraction | Wraps `BackgroundService`, zero dependency |

## Excluded (need new third-party packages)

- OpenTelemetry → `OpenTelemetry.*` ecosystem
- Resilience (Polly v8) → `Polly` / `Microsoft.Extensions.Resilience`
- gRPC → `Grpc.AspNetCore`
- `dotnet new` templates → `Microsoft.TemplateEngine.*`
- OpenAPI client generation → `Kiota` / `NSwag` / `Swashbuckle`
- Full background job scheduling (Hangfire etc.) → `Hangfire`

## Gray area (depends on runtime built-in status)

- API versioning → .NET 10 stable has no built-in API yet; requires `Microsoft.AspNetCore.Mvc.Versioning`
