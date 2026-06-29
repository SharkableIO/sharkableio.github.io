# Authorization Interceptor

Sharkable provides a pluggable `IAuthorizationInterceptor` that runs before every endpoint. Use it for claim-based RBAC, tenant-scoped access control, custom API-key validation, or any pre-request authorization logic.

## Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.AuthorizationInterceptorFactory = sp => new MyPermissionInterceptor();
});
```

## Implementation

```csharp
public class MyPermissionInterceptor : IAuthorizationInterceptor
{
    public IResult? Authorize(HttpContext ctx)
    {
        // JWT claims
        var userId = ctx.User.FindFirst("sub")?.Value;
        var roles = ctx.User.FindAll("role").Select(c => c.Value).ToList();

        // API key
        ctx.Request.Headers.TryGetValue("X-Api-Key", out var apiKey);

        // Custom logic
        if (!HasAccess(userId, ctx.Request.Path))
            return Results.Json(new { error = "No permission" }, statusCode: 403);

        // Allow
        return null;
    }
}
```

## Contract

- **Return `null`** → request proceeds to the endpoint
- **Return `IResult`** → response is sent immediately, endpoint is skipped
- The interceptor receives the full `HttpContext` with access to `User` (ClaimsPrincipal), request headers, path, etc.
- Runs **after** authentication but **before** the endpoint handler
- Applied as an `IEndpointFilter` on every route group

## RBAC Example

```csharp
public class RbacInterceptor : IAuthorizationInterceptor
{
    private static readonly Dictionary<string, string[]> RolePermissions = new()
    {
        ["admin"] = ["order:read", "order:write", "product:read", "product:write"],
        ["user"] = ["order:read", "product:read"],
    };

    public IResult? Authorize(HttpContext ctx)
    {
        var roles = ctx.User.FindAll("role").Select(c => c.Value).ToList();
        var path = ctx.Request.Path.Value ?? "";
        var method = ctx.Request.Method;
        var action = method switch
        {
            "GET" or "HEAD" => "read",
            _ => "write",
        };

        // Extract resource from path: /api/order/123 → order
        var segments = path.Trim('/').Split('/');
        var resource = segments.Length >= 2 ? segments[1] : "";

        foreach (var role in roles)
        {
            if (RolePermissions.TryGetValue(role, out var perms) &&
                perms.Contains($"{resource}:{action}"))
                return null; // authorized
        }

        return Results.Json(new { error = "Insufficient permissions" }, statusCode: 403);
    }
}
```

## Tenant-Scoped Access

```csharp
public class TenantInterceptor : IAuthorizationInterceptor
{
    public IResult? Authorize(HttpContext ctx)
    {
        var tenantClaim = ctx.User.FindFirst("tenant_id")?.Value;
        var tenantFromHeader = ctx.Request.Headers["X-Tenant-Id"].ToString();

        if (tenantClaim != tenantFromHeader)
            return Results.Json(new { error = "Tenant mismatch" }, statusCode: 403);

        return null;
    }
}
```

## Combined with API Key

The interceptor runs even when [API Key authentication](api-key-auth) is used (no JWT user). Check `ctx.User.Identity?.IsAuthenticated` to distinguish:

```csharp
public IResult? Authorize(HttpContext ctx)
{
    if (!ctx.User.Identity?.IsAuthenticated ?? false)
    {
        // Unauthenticated — handled by auth middleware
        return null;
    }
    // RBAC logic for authenticated users
    return null;
}
```
