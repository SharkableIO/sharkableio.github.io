# API Key Authentication

Sharkable provides two modes for API key authentication:

| Mode | Use case | Setup |
|------|----------|-------|
| Static list | Dev / simple scenarios | `opt.ApiKeys = [...]` |
| Interceptor | Per-client keys, scopes, expiry | `IAuthorizationInterceptor` |

## Quick Start (Static List)

```csharp
builder.Services.AddShark(opt =>
{
    opt.ApiKeys = ["your-secret-key", "another-key"];
});
```

Clients send `X-Api-Key` header by default. The header name is configurable via `opt.ApiKeyHeaderName = "X-App-Key"`. Valid keys pass through; invalid/missing keys return 401.

## Per-Client Keys with Scopes & Expiry

For production, implement `IAuthorizationInterceptor` to validate keys against your own store (database, Redis, etc.):

```csharp
builder.Services.AddShark(opt =>
{
    opt.AuthorizationInterceptorFactory = sp => new ApiKeyValidator();
});
```

```csharp
public class ApiKeyValidator : IAuthorizationInterceptor
{
    public IResult? Authorize(HttpContext ctx)
    {
        ctx.Request.Headers.TryGetValue("X-Api-Key", out var key);
        if (string.IsNullOrEmpty(key))
            return Results.Json(new { error = "Missing API key" }, statusCode: 401);

        // Validate against your store
        var info = _myStore.Get(key);
        if (info == null)
            return Results.Json(new { error = "Invalid API key" }, statusCode: 401);
        if (info.ExpiresAt < DateTimeOffset.UtcNow)
            return Results.Json(new { error = "API key expired" }, statusCode: 401);

        // Expose client info to downstream endpoints
        ctx.Items["ApiKeyClient"] = info.Client;
        ctx.Items["ApiKeyScopes"] = info.Scopes;

        return null; // pass
    }
}
```

### Downstream Usage

Endpoints can read the client info set by the interceptor:

```csharp
app.MapGet("/orders", (HttpContext ctx) =>
{
    var client = ctx.Items["ApiKeyClient"] as string;
    var scopes = ctx.Items["ApiKeyScopes"] as string[];
    // scope-based access control
});
```

### Combined with JWT

The interceptor handles both API key and JWT in one place:

```csharp
public IResult? Authorize(HttpContext ctx)
{
    // JWT path
    if (ctx.User.Identity?.IsAuthenticated == true)
    {
        var sub = ctx.User.FindFirst("sub")?.Value;
        ctx.Items["Client"] = sub;
        return null;
    }

    // API key path
    ctx.Request.Headers.TryGetValue("X-Api-Key", out var key);
    // ... validate key as above
}
```

## Custom API Key Validator

For advanced scenarios (database-backed keys, scoped permissions, tenant association), implement `IApiKeyValidator` instead of the static `ApiKeys` array:

```csharp
public class DatabaseApiKeyValidator : IApiKeyValidator
{
    public async Task<ApiKeyValidationResult> ValidateAsync(
        string key, HttpContext context, CancellationToken cancellationToken)
    {
        // Look up the key in your store
        var apiKey = await _db.ApiKeys
            .Include(k => k.Tenant)
            .FirstOrDefaultAsync(k => k.Key == key, cancellationToken);

        if (apiKey is null)
            return ApiKeyValidationResult.Fail();

        return ApiKeyValidationResult.Success(new List<Claim>
        {
            new("client_id", apiKey.ClientId),
            new("tenant", apiKey.Tenant.Name),
        }, rateLimitMultiplier: apiKey.Tier == "premium" ? 5.0 : 1.0);
    }
}
```

Register via DI **before** `AddShark()`:

```csharp
services.AddSingleton<IApiKeyValidator, DatabaseApiKeyValidator>();
builder.Services.AddShark();
```

- `ApiKeyValidationResult` carries a list of `Claim` objects (automatically set as `HttpContext.User.ClaimsPrincipal`) and an optional `RateLimitMultiplier` for per-client rate limit scaling.
- The default validator uses the static `ApiKeys` array with SHA-256 comparison when no custom implementation is registered.
- When both `IApiKeyValidator` and static `ApiKeys` are configured, the custom validator takes precedence.

## Unified Error Response

Auth failures return the framework's standard unified result envelope:

```json
{
  "statusCode": 401,
  "data": null,
  "errorMessage": "Invalid API key",
  "extra": null,
  "timeStamp": 1750934400000
}
```
