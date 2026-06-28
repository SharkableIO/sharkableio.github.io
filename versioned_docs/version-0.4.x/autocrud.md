# AutoCrud

Sharkable provides automatic CRUD API generation via `IAutoCrudEntity<T>`. Implement this marker interface on any `ISharkEndpoint` class, and all five CRUD operations are generated automatically — with zero additional configuration.

## Quick Start

### 1. Install Plugin

```bash
dotnet add package Sharkable.AutoCrud.SqlSugar
```

### 2. Configure Database

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureAutoCrud(s =>
    {
        s.DbType = DbType.Sqlite;
        s.ConnectionString = "DataSource=app.db";
    });
});
```

### 3. Define Entity + Endpoint

```csharp
[SugarTable("products")]
public class Product
{
    [SugarColumn(IsPrimaryKey = true)]
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
}

public class ProductEndpoint : ISharkEndpoint, IAutoCrudEntity<Product>
{
    // Empty — all 5 CRUD operations auto-generated
}
```

**Generated routes** at `api/product`:

| Method | Route | Operation |
|--------|-------|-----------|
| `GET` | `/` | List all |
| `GET` | `/{id}` | Get by PK |
| `POST` | `/` | Create |
| `PUT` | `/{id}` | Update |
| `DELETE` | `/{id}` | Delete |

## Suppress Operations

Use `AllowedOperations` to selectively disable CRUD operations:

```csharp
public class ReadOnlyEndpoint : ISharkEndpoint, IAutoCrudEntity<Product>
{
    CrudOperations IAutoCrudEntity<Product>.AllowedOperations =>
        CrudOperations.List | CrudOperations.Get;
    // POST, PUT, DELETE suppressed
}
```

Available flags: `None`, `List`, `Get`, `Create`, `Update`, `Delete`, `All`.

## Custom Override

Write your own routes in `AddRoutes()` — they take precedence over auto-generated ones:

```csharp
public class ProductEndpoint : ISharkEndpoint, IAutoCrudEntity<Product>
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        // Custom list with filtering
        app.MapGet("/", async (ISqlSugarClient db) =>
        {
            var list = await db.Queryable<Product>()
                .Where(p => p.Price > 0)
                .OrderBy(p => p.Name)
                .ToListAsync();
            return Results.Ok(list);
        });
    }
    // Get, Create, Update, Delete still auto-generated
}
```

## Health Check

When `EnableHealthChecks = true`, SqlSugar connectivity is automatically checked via `/healthz`:

```json
{
  "checks": {
    "SqlSugar": {
      "status": "healthy",
      "description": "SqlSugar connected in 3ms",
      "data": { "latencyMs": 3, "dbType": "Sqlite" }
    }
  }
}
```

## Architecture

- **Sharkable core** provides `IAutoCrudEntity<T>` + `CrudOperations` + `IAutoCrudGenerator`
- **Sharkable.AutoCrud.SqlSugar** implements `IAutoCrudGenerator` with SqlSugar ORM
- Future ORM plugins can implement `IAutoCrudGenerator` for other databases (EF Core, Dapper, etc.)
