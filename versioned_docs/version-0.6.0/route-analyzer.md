# Route Conflict Analyzer

Sharkable ships a Roslyn Analyzer (`SHARK001`) that detects duplicate route registrations at compile time. No configuration required — it activates automatically when you install the NuGet package.

## What It Detects

When two `ISharkEndpoint` classes in the **same group** map the same HTTP method + route, a compile-time warning is raised:

```
SHARK001: Route conflict: 'api/order/create' is already mapped by 'OrderEndpoint'
```

**Detected conflicts:**
- Same HTTP method (`GET`, `POST`, etc.) + same route template within the same group
- `{id:int}` and `{id:guid}` are treated as the same route parameter (constraints are stripped for comparison)

**Not detected (correctly):**
- Same route in different groups — versioned classes like `OrderV1Endpoint` and `OrderV2Endpoint` produce different group names (`order@1` vs `order@2`)
- Different HTTP methods on the same route — `GET /users/{id}` and `DELETE /users/{id}` are fine

## Example

```csharp
public class OrderEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("create", () => "ok");       // api/order/create
    }
}

public class OrderService : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("create", () => "nope");     // SHARK001 ⚠️ api/order/create already mapped by OrderEndpoint
    }
}
```

## Group Name Derivation

The analyzer replicates Sharkable's runtime group name logic:
1. Strip trailing `Endpoint` / `Service` / `Services` / `Controller` / `Controllers` / `ApiController` (case-insensitive)
2. Convert `V\d+` suffix to `@\d+` (version format)
3. Apply `CamelCase`

| Class Name | Group Name |
|-----------|------------|
| `OrderEndpoint` | `order` |
| `OrderV2Endpoint` | `order@2` |
| `UserApiController` | `user` |
| `PaymentService` | `payment` |

Classes with different group names never conflict, even if they use the same route templates.

## Configure Severity

The `SHARK001` diagnostic defaults to **warning**. Change severity via `.editorconfig`:

```ini
[*.cs]
dotnet_diagnostic.SHARK001.severity = error   # fail the build on conflict
```

Or suppress for specific scenarios:

```ini
dotnet_diagnostic.SHARK001.severity = none
```
