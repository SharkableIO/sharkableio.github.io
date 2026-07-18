# Response Cache Profile

Sets `Cache-Control` (and optional `Vary`) headers per endpoint group. Composes with ETag and ASP.NET Output Cache.

## Quick Start

Apply `[SharkCacheProfile]` on an `ISharkEndpoint` class:

```csharp
[SharkCacheProfile(durationSeconds: 60, VaryByHeader = "Accept-Language")]
public class ProductsEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("list", () => new[] { "item1", "item2" });
    }
}
```

All routes in the group get `Cache-Control: public, max-age=60` and `Vary: Accept-Language`.

## Configuration

| Property | Type | Default | Description |
|---|---|---|---|
| `DurationSeconds` | `int` | _(required)_ | `max-age` value in seconds |
| `VaryByHeader` | `string?` | `null` | `Vary` response header value |
| `PrivateOnly` | `bool` | `false` | `true` → `Cache-Control: private`, `false` → `public` |
| `ExtraDirectives` | `string?` | `null` | Additional directives (e.g. `"no-transform"`, `"must-revalidate"`) |

## Composition

- **ETag**: `[SharkCacheProfile(60)]` + `opt.EnableETag = true` → both `Cache-Control` and `ETag` headers are present
- **Output Cache**: `[SharkCacheProfile(60)]` + `.SharkCacheOutput("profile")` → both client-side and server-side caching

## AOT

Fully AOT-compatible — uses endpoint metadata, no reflection.
