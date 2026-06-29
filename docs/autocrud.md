# AutoCrud

Sharkable provides automatic CRUD API generation via `IAutoCrudEntity<T>`. Implement this marker interface on any `ISharkEndpoint` class, and safe CRUD operations are generated automatically — paginated by default, with zero additional configuration.

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
    // Empty — safe CRUD auto-generated (paginated, no full dump)
}
```

**Generated routes** at `api/product`:

| Method | Route | Operation | Description |
|--------|-------|-----------|-------------|
| `GET` | `/` | Paginated list | `?page=1&pageSize=20` → `{items,total,page,pageSize,totalPages}` |
| `GET` | `/{id}` | Get by PK | Single entity |
| `POST` | `/` | Create | Request body = entity |
| `PUT` | `/{id}` | Update | Request body = entity |
| `DELETE` | `/{id}` | Delete | By PK |

## Pagination

`List` returns paginated results by default. No extra config needed:

```
GET /api/product?page=1&pageSize=20
```

```json
{
  "items": [{ "id": 1, "name": "Widget", "price": 9.99 }, ...],
  "total": 847,
  "page": 1,
  "pageSize": 20,
  "totalPages": 43
}
```

`pageSize` is capped at 100. Unknown fields in query params are silently ignored.

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

Available flags: `None`, `List`, `Get`, `Create`, `Update`, `Delete`, `ListAll`, `All`.

> `All = List | Get | Create | Update | Delete` — **does not include `ListAll`**. Full-table dumps must be explicitly opted into for safety.

### Enable Full-Table Dump

```csharp
CrudOperations IAutoCrudEntity<Product>.AllowedOperations =>
    CrudOperations.All | CrudOperations.ListAll;
// Now GET /all returns the entire table
```

`ListAll` is intentionally excluded from `All` — full dumps are dangerous on large tables.

## Custom Override

Write your own routes in `AddRoutes()` — they take precedence over auto-generated ones:

```csharp
public class ProductEndpoint : ISharkEndpoint, IAutoCrudEntity<Product>
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
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

## Search & Filtering

The `List` operation supports filtering via `filter[field][op]=value` query parameters, plus sorting and pagination — all automatically, no code changes needed.

### URL Convention

```
GET /api/product?filter[price][gte]=100&filter[price][lte]=500&filter[name][like]=Widget%&sort=-price&page=1&pageSize=20
```

### Operators

| Key | SQL | Example |
|-----|-----|---------|
| *(no op)* | `=` | `?filter[name]=Widget` |
| `eq` | `=` | `?filter[name][eq]=Widget` |
| `ne` | `<>` | `?filter[price][ne]=0` |
| `gt` / `gte` | `>` / `>=` | `?filter[price][gte]=100` |
| `lt` / `lte` | `<` / `<=` | `?filter[price][lte]=500` |
| `like` | `LIKE` | `?filter[name][like]=Widget%` |
| `in` / `nin` | `IN` / `NOT IN` | `?filter[status][in]=active,pending` |
| `null` | `IS NULL` | `?filter[deleted][null]=true` |

### Sorting

`?sort=field` (asc), `?sort=-field` (desc), `?sort=-price,+name` (multi-field).

### Safety

Unknown fields are silently ignored. All values are parameterized.

### Frontend Example

```javascript
const params = new URLSearchParams({
  'filter[price][gte]': 100,
  'filter[name][like]': 'Widget%',
  sort: '-price'
});
fetch(`/api/product?${params}`);
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
