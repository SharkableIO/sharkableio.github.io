# Endpoint Grouping & OpenAPI Tags

Sharkable provides automatic endpoint grouping, OpenAPI tags, and OperationId generation for `ISharkEndpoint` endpoints.

## How grouping works

By default, each `ISharkEndpoint` class becomes its own route group. The group name is derived from the class name by stripping the `Endpoint`/`Service`/`Controller` suffix.

```csharp
public class UserEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("profile", () => "user profile");
    }
}
```

URL: `api/user/profile` — group name `user`, tag `user`.

## Explicit grouping with `[EndpointGroup]`

Multiple endpoint classes can share the same URL prefix and OpenAPI tag.

```csharp
[EndpointGroup("admin")]
public class UserEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("users", () => Results.Ok(users));
    }
}

[EndpointGroup("admin")]
public class RoleEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("roles", () => Results.Ok(roles));
    }
}
```

Both under `api/admin/...`, sharing filters and middleware.

## OpenAPI tags via `[SharkTag]`

Override the default tag (derived from group name) with explicit tags.

```csharp
[SharkTag("admin")]
[SharkTag("management")]
public class UserEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("users", () => Results.Ok(users));
    }
}
```

OpenAPI tag: `["admin", "management"]`. Repeatable attribute for multiple tags.

## Auto OperationId

OperationId is automatically generated for every route: `{groupName}_{httpMethod}_{relativePath}`.

```csharp
// Route: GET /api/test/hello
// OperationId: test_GET_hello

// Route: POST /api/admin/users
// OperationId: admin_POST_users
```

Manual `.WithOperationId()` or `.WithMetadata(new EndpointNameMetadata(...))` in your `AddRoutes()` method takes precedence over auto-generation.

## Configuration

Endpoint format (case style) is configurable via `SharkOption`:

```csharp
builder.Services.AddShark(opt =>
{
    opt.Format = EndpointFormat.SnakeCase; // default: CamelCase
    opt.ApiPrefix = "api"; // default
});
```

| Format | Group `TestUser` | URL |
|--------|------------------|-----|
| CamelCase (default) | testUser | `api/testUser/...` |
| SnakeCase | test_user | `api/test_user/...` |
| ToLower | testuser | `api/testuser/...` |
| UnChanged | TestUser | `api/TestUser/...` |

### Customizing Suffix Stripping & Version Format

The class name suffix stripping and version prefix conversion are configurable:

```csharp
builder.Services.AddShark(opt =>
{
    // Regex for stripping common suffixes from endpoint group names.
    // Default: removes Endpoint/Service/Controller (case-insensitive, at end).
    opt.GroupNameSuffixPattern = "(endpoint|service|services|controller|controllers|apicontroller)(?=V?\\d*$)";

    // Version format: how V{number} is converted in URLs. Default: V1 -> @1.
    opt.VersionFormatPattern = @"V(\d+)";
    opt.VersionFormatReplacement = @"@$1";
});
```

For example, a class `TestServiceV2` with custom pattern `"(api|service)"` would produce group `TestV2` → URL `api/test-v2/...` depending on format.

## Old-style `[SharkEndpoint]` endpoints (deprecated, AOT-incompatible)

> **Deprecated since v0.4.0. Will be removed in v0.5.0.** Attribute-based endpoints use runtime reflection and do **not** work in Native AOT publishing. Migrate to `ISharkEndpoint` immediately.

Attribute-based endpoints also get OpenAPI tags and OperationId support:

```csharp
[SharkEndpoint]
[SharkTag("catalog")]
public class CatalogEndpoint
{
    [SharkMethod("items/{id}", SharkHttpMethod.GET)]
    public Item? GetItem(int id) { ... }
}
```
