# Multi-Tenant

Sharkable provides an opt-in multi-tenant resolution system. A scoped `ITenant` service is injected into any class that needs tenant awareness, and the tenant identifier is resolved per-request via configurable middleware.

## Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureMultiTenant(cfg =>
    {
        cfg.ResolveTenant = ctx =>
            TenantResolver.FromHost(ctx)
            ?? TenantResolver.FromClaim(ctx);
    });
});

var app = builder.Build();
app.UseShark();   // wires TenantResolutionMiddleware automatically
```

Inject `ITenant` anywhere:

```csharp
public class OrderService
{
    private readonly ITenant _tenant;

    public OrderService(ITenant tenant)
    {
        _tenant = tenant;
    }

    public async Task<List<Order>> GetOrdersAsync()
    {
        var tenantId = _tenant.TenantId;
        // filter by tenantId for data isolation
    }
}
```

## Resolving the Tenant

Tenant identity is resolved once per request by `TenantResolutionMiddleware`, then stored on the scoped `ITenant` for the remainder of the request.

The middleware checks `TenantOptions.ResolveTenant` at the start of each request. Set this delegate via `ConfigureMultiTenant()`.

### Built-in Resolvers

```csharp
// Subdomain: tenant1.myapp.com → "tenant1"
TenantResolver.FromHost(HttpContext)

// JWT claim: reads "tenant_id" claim (customizable)
TenantResolver.FromClaim(HttpContext, claimType: "tenant_id")
```

Chain them with `??` for fallback:

```csharp
cfg.ResolveTenant = ctx =>
    TenantResolver.FromHost(ctx)
    ?? TenantResolver.FromClaim(ctx, "tenant_id");
```

### Custom Lambda

For any other strategy, provide your own delegate:

```csharp
cfg.ResolveTenant = ctx =>
{
    var header = ctx.Request.Headers["X-Tenant"].FirstOrDefault();
    return !string.IsNullOrEmpty(header) ? header : null;
};
```

## Configuration

```csharp
opt.ConfigureMultiTenant(cfg =>
{
    // Func<HttpContext, string?> — return null when unresolvable
    cfg.ResolveTenant = ctx => TenantResolver.FromClaim(ctx);
});
```

## Behavior

| Situation | Result |
|---|---|
| Resolver returns a value | `ITenant.TenantId` is set for the request |
| Resolver returns `null` | `ITenant.TenantId` is `null`; the application handles it |
| No `ConfigureMultiTenant` call | Middleware is not wired; no tenant resolution |
| Multiple resolvers chained | First non-null result wins |

## AOT Support

Fully AOT-safe. No reflection, no `dynamic`. The middleware resolves tenant via a `Func<HttpContext, string?>` delegate, and `ITenant` / `Tenant` are plain interfaces and classes.
