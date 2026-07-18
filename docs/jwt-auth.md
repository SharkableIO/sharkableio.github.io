# JWT Bearer Authentication

Sharkable provides opinionated JWT Bearer authentication with minimal configuration.

## Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureJwt(jwt =>
    {
        jwt.Authority = "https://your-issuer.com";
        jwt.Audiences = ["your-api"];
        jwt.BearerConfigure = jwtBearer =>
        {
            // optional additional JwtBearerOptions configuration
        };
    });
});
```

> **Migration note:** The old overload `ConfigureJwt(string authority, string[] audiences, Action<JwtBearerOptions>?)` is obsolete. Use the single-parameter `ConfigureJwt(Action<JwtOptions>)` pattern shown above.

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
opt.ConfigureJwt(jwt =>
{
    jwt.Authority = "https://your-issuer.com";
    jwt.Audiences = ["your-api"];
    jwt.BearerConfigure = jwtBearer =>
    {
        jwtBearer.Events.OnTokenValidated = ctx =>
        {
            var sub = ctx.Principal.FindFirst("sub")?.Value;
            var roles = ctx.Principal.FindAll("role");
            // Resolve user identity, populate HttpContext.Items, etc.
            return Task.CompletedTask;
        };
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

## Authorization Configuration

Sharkable registers ASP.NET Core's authorization services by default (`services.AddAuthorization()`). This ensures that `pipe.UseAuthorization()` works wherever it's invoked. Three options control this behavior:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `EnableAuthorization` | `bool` | `true` | Set to `false` to skip authorization service registration entirely |
| `RequireAuthenticatedByDefault` | `bool` | `false` | When `true`, auto-injects `[Authorize]` metadata on every endpoint (equivalent to calling `.RequireAuthorization()` on each). Endpoints with existing `IAuthorizeData` or `IAllowAnonymous` are skipped. |
| `ConfigureAuthorization` | `Action<AuthorizationOptions>?` | `null` | Callback to customize policies, default policy, fallback policy, etc. |

### Custom Authorization Policies

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureJwt(jwt =>
    {
        jwt.Authority = "https://your-issuer.com";
        jwt.Audiences = ["your-api"];
    });

    opt.ConfigureAuthorization = o =>
    {
        o.DefaultPolicy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .Build();

        o.AddPolicy("admin", p => p.RequireRole("admin"));
        o.AddPolicy("editor", p => p.RequireRole("editor", "admin"));
    };
});
```

### Disable Authorization

```csharp
opt.EnableAuthorization = false;
```

Disabling authorization (`EnableAuthorization = false`) skips both `services.AddAuthorization()` and `app.UseAuthorization()`. Use this only when your application has no need for ASP.NET Core authorization at all.

## Integration with API Key

JWT and [API Key](api-key-auth) authentication can coexist. When both are configured, either credential type is accepted.
