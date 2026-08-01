# API Versioning

Sharkable supports API versioning via the `[SharkVersion]` attribute. This allows you to host multiple API versions side-by-side under different URL prefixes.

## Quick start

Apply `[SharkVersion("v1")]` to your `ISharkEndpoint` class:

```csharp
[SharkVersion("v1")]
public class UserV1Endpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("profile", () => "user profile v1");
    }
}

[SharkVersion("v2")]
public class UserV2Endpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("profile", () => "user profile v2");
    }
}
```

URLs:

| Endpoint | URL |
|----------|-----|
| `UserV1Endpoint` | `api/v1/user_v1/profile` |
| `UserV2Endpoint` | `api/v2/user_v2/profile` |

## Combining with EndpointGroup

`[SharkVersion]` works together with `[EndpointGroup]`:

```csharp
[SharkVersion("v2")]
[EndpointGroup("admin")]
public class AdminV2Endpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("status", () => "admin status v2");
    }
}
```

URL: `api/v2/admin/status`

## How it works

- The version string is inserted into the URL prefix: `{apiPrefix}/{version}/{group}/{route}`
- Versions are also included in auto-generated OperationIds for uniqueness
- Endpoints with different versions are grouped separately, even if they share the same `[EndpointGroup]`
- AOT-safe — uses attribute metadata, no reflection at runtime

## Full example

```csharp
[SharkVersion("v1")]
public class CatalogV1Endpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("items", () => new[] { "item1", "item2" });
    }
}

[SharkVersion("v2")]
[EndpointGroup("catalog")]
public class CatalogV2Endpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("items", () => new[] { "item1", "item2", "item3" });
    }
}
```

## OpenAPI documents

Versioned endpoints are included in the OpenAPI document with their full paths and unique OperationIds. The document reflects the actual routing structure.
