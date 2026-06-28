# JWT Bearer Authentication

Sharkable provides opinionated JWT Bearer authentication with minimal configuration.

## Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureJwt(
        authority: "https://your-issuer.com",
        audiences: ["your-api"],
        configure: jwt =>
        {
            // optional additional JwtBearerOptions configuration
        }
    );
});
```

## Unified Error Response

Authentication (401) and authorization (403) failures return the framework's standard unified result envelope:

```json
{
  "statusCode": 401,
  "data": null,
  "errorMessage": "Authentication failed",
  "extra": null,
  "timeStamp": 1750934400000
}
```

## Configuration Validation

At startup, Sharkable validates that both `authority` and `audiences` are properly configured. If either is missing or invalid, a `SharkConfigurationException` is thrown before the application starts. See [Configuration Validation](config-validation) for details.

## Custom JWT Event Handlers

Use the `configure` callback to hook into JWT events without losing Sharkable's unified error responses:

```csharp
opt.ConfigureJwt("https://your-issuer.com", ["your-api"], configure: jwt =>
{
    jwt.Events.OnTokenValidated = ctx =>
    {
        var sub = ctx.Principal.FindFirst("sub")?.Value;
        var roles = ctx.Principal.FindAll("role");
        // Resolve user identity, populate HttpContext.Items, etc.
        return Task.CompletedTask;
    };
});
```

Sharkable's `OnChallenge` / `OnForbidden` handlers run AFTER yours and are **never overwritten**. If your handler already started the response (e.g. `ctx.Response.WriteAsync()`), Sharkable's handler gracefully skips.

## Authorization Interceptor

For fine-grained RBAC or claim-based access control, implement `IAuthorizationInterceptor`:

```csharp
opt.AuthorizationInterceptorFactory = sp => new MyPermissionInterceptor();
```

See [Authorization Interceptor](authorization-interceptor) for full usage.

## Integration with API Key

JWT and [API Key](api-key-auth) authentication can coexist. When both are configured, either credential type is accepted.
