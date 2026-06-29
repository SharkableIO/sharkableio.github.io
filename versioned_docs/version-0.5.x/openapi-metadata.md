# OpenAPI Metadata Attributes

Sharkable provides class-level attributes to enrich the generated OpenAPI document for `ISharkEndpoint` classes.

## `[SharkDescription]`

Sets a default summary and description for all operations in the endpoint group. Per-endpoint `.WithSummary()` / `.WithDescription()` calls take precedence.

```csharp
[SharkDescription("User management", "Endpoints for creating, reading, updating, and deleting users.")]
public class UserEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("", () => Results.Ok(users))
           .WithSummary("List users"); // overrides the class-level summary
    }
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `summary` | `string?` | Short operation summary. |
| `description` | `string?` | Detailed operation description. |

## `[SharkResponseType]`

Repeatable attribute that adds additional response metadata entries (status code + optional type + description) to every operation in the group. Useful for documenting error responses like 400, 404, or 500.

```csharp
[SharkResponseType(400, typeof(ValidationProblemDetails), "Validation error")]
[SharkResponseType(404, typeof(string), "User not found")]
[SharkResponseType(500, typeof(ProblemDetails), "Internal server error")]
public class UserEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("{id}", (int id) => Results.Ok(new { Id = id }));
    }
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `statusCode` | `int` | HTTP status code (e.g., 200, 400, 404). |
| `responseType` | `Type?` | Response type for serialization metadata. |
| `description` | `string?` | Response description. |

## `[SharkDeprecated]`

Marks all endpoints in the class as deprecated by adding an `ObsoleteAttribute` to the endpoint metadata. Operations are rendered with a deprecation marker in the OpenAPI document.

```csharp
[SharkDeprecated]
public class OldEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("legacy", () => "This will be removed soon.");
    }
}
```

No parameters. Applies to the entire class.

## `[SharkTag]`

Repeatable attribute that overrides the auto-derived OpenAPI tag (normally derived from the group name). Each call adds a tag entry.

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

OpenAPI tag: `["admin", "management"]`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `tag` | `string` | The OpenAPI tag value. |

## Precedence

Per-endpoint overrides (`WithSummary()`, `WithDescription()`, `WithOpenApi()`, `WithOperationId()`) always take precedence over class-level attributes. Multiple class-level attributes compose — for example, `[SharkTag]` and `[SharkResponseType]` can be combined on the same class.

## Old-style `[SharkEndpoint]` endpoints (AOT-incompatible)

> ⚠️ Attribute-based endpoints use runtime reflection and do **not** work in Native AOT publishing. Use `ISharkEndpoint` for AOT-safe code.

Attribute-based old-style endpoints also support these metadata attributes:

```csharp
[SharkEndpoint]
[SharkDescription("Catalog query", "Query product categories")]
[SharkTag("catalog")]
[SharkResponseType(200, typeof(List<Category>), "Category list")]
public class CatalogEndpoint
{
    [SharkMethod("list", SharkHttpMethod.GET)]
    public List<Category> GetList() { ... }
}
```
