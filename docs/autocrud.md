# AutoCrud

Sharkable provides automatic CRUD API generation via `IAutoCrudEntity<T>`. Implement this marker interface on any `ISharkEndpoint` class, and safe CRUD operations are generated automatically — paginated by default, with zero additional configuration.

## Why SqlSugar

Sharkable.AutoCrud is built on [SqlSugar](https://github.com/DotNetNext/SqlSugar) — a lightweight, high-performance ORM for .NET:

| | |
|---|---|
| **License** | MIT — no restrictions, commercial-friendly |
| **Databases** | MySQL, SQL Server, PostgreSQL, SQLite, Oracle, MariaDB, 达梦, 人大金仓, 瀚高, GaussDB, DuckDB, MongoDB, QuestDB, ClickHouse, OceanBase, DB2, HANA, TDSQL, ODBC |
| **Performance** | Close to raw ADO.NET — faster than EF Core in benchmarks |
| **AOT support** | `StaticConfig.EnableAot = true` — compatible with .NET Native AOT |
| **No tracking overhead** | Queries return plain POCO objects by default, zero change-tracking cost |
| **LINQ + Lambda + SQL** | Full LINQ support with `Where/OrderBy/Select`, plus raw SQL when needed |
| **Code-first / DB-first** | Auto-migrate from entities or reverse-engineer from existing databases |
| **Tenant support** | Built-in multi-tenant table/DB isolation via `SugarTenant` |
| **Split-table / split-db** | Horizontal partitioning and sharding out of the box |
| **Seed data** | Built-in data seeder for test/demo environments |

All of these work with Sharkable.AutoCrud without extra configuration — the generator maps `IAutoCrudEntity<T>` directly to SqlSugar's `Queryable<T>/Insertable<T>/Updateable<T>/Deleteable<T>` APIs.

## Quick Start

### 1. Install Plugin

```bash
dotnet add package Sharkable.AutoCrud.SqlSugar
```

The package implements `ISharkPlugin` and is **auto-discovered** by Sharkable at startup — no manual wiring required. Simply reference the package and configure the database connection.

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

Default page size is 20; maximum is 100. Both are configurable via `SqlSugarOptions`:

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureAutoCrud(s =>
    {
        s.DbType = DbType.Sqlite;
        s.ConnectionString = "DataSource=app.db";
        s.MaxPageSize = 200;
        s.DefaultPageSize = 50;
    });
});
```

Unknown fields in query params are silently ignored.

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

When `EnableHealthChecks = true`, SqlSugar connectivity is automatically checked via `/healthz`. The description and payload are intentionally generic — database type and exception messages are logged for operators only, never surfaced on the public endpoint (SHARK-SEC-026):

```json
{
  "checks": {
    "SqlSugar": {
      "status": "healthy",
      "description": "Database reachable",
      "data": { "latencyMs": 3 }
    }
  }
}
```

## Soft Delete

Mark an entity with `ISoftDeletable` and AutoCrud handles soft deletion automatically — no code changes needed:

```csharp
public class Product : ISoftDeletable
{
    public int Id { get; set; }
    public bool IsDeleted { get; set; }  // convention-based detection
}
```

**Behavior**:

| Operation | Without ISoftDeletable | With ISoftDeletable |
|-----------|----------------------|---------------------|
| List / Get / ListAll | All rows | `WHERE IsDeleted = 0` only |
| Delete | Hard delete | `UPDATE SET IsDeleted = 1` (soft) |

The `IsDeleted` property is detected by name (case-insensitive). No attributes, no configuration — just add the interface.

The field name is configurable via `SqlSugarOptions` if your entity uses a different name:

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureAutoCrud(s =>
    {
        s.SoftDeleteFieldName = "IsRemoved";
    });
});
```

```csharp
public class Product : ISoftDeletable
{
    public int Id { get; set; }
    public bool IsRemoved { get; set; }  // custom field name
}
```

## AOT Support (Zero rd.xml)

.NET Native AOT publishing requires all types to be known at compile time — the trimmer removes unreferenced types. Normally, SqlSugar entities need manual `rd.xml` entries to survive trimming.

Sharkable ships a Source Generator that discovers all `IAutoCrudEntity<T>` implementations and emits `typeof(T)` references for every entity type — forcing the trimmer to preserve them. **No rd.xml needed.**

```bash
dotnet publish -c Release -r linux-x64 --self-contained
# Entity types are preserved automatically
```

Works with any `Sharkable.AutoCrud.SqlSugar` version that depends on Sharkable ≥ 0.4.1.

## Field allowlist with [CrudAllow]

Starting in **v0.6.0**, AutoCrud no longer accepts every property on a writable entity by default. The `[CrudAllow]` attribute declares exactly which fields `Create` and `Update` are allowed to write — every other property is excluded.

### Why

Before v0.6.0, `InsertableByObject` and `UpdateableByObject` wrote every column the entity contained, allowing mass-assignment of sensitive fields via the JSON body (`IsAdmin=true`, `CreatedBy=admin`, `TenantId=competitor`, `IsDeleted=false` to revive soft-deleted records). See [SHARK-SEC-006 in the security disclosure](./security.md) for the full audit.

### Default-deny in v0.6.0

The semantic flipped from default-allow to default-deny:

| Version | Property without `[CrudAllow]` |
|---------|--------------------------------|
| ≤ 0.5.x | included in Insertable / Updateable |
| ≥ 0.6.0 | excluded — never written by AutoCrud |

The primary key is always excluded (URL-bound on PUT, DB-generated on POST). The configured soft-delete column (`SqlSugarOptions.SoftDeleteFieldName`, default `"IsDeleted"`) is **also** excluded even when `[CrudAllow]` is present, so an attacker cannot revive soft-deleted rows by sending the field in a PUT body. Honors `[SugarColumn(ColumnName = "...")]` renames.

### Marking writable fields

```csharp
public class Product : IAutoCrudEntity<Product>
{
    [SugarColumn(IsPrimaryKey = true)]
    public int Id { get; set; }

    [CrudAllow]
    public string Name { get; set; } = "";

    [CrudAllow]
    public decimal Price { get; set; }

    public DateTime CreatedAt { get; set; }   // server-set, never writable from body
}
```

Only `Name` and `Price` end up in the generated `Insertable.IgnoreColumns` / `Updateable.UpdateColumns` allow-list. Apply `[CrudAllow]` to any other field the endpoint should let clients set.

### Fail-closed at startup

If `Create` or `Update` is enabled on an entity with **zero** `[CrudAllow]` properties, route generation throws `InvalidOperationException` at startup — not silently expose a no-write endpoint:

```
System.InvalidOperationException: ProductEntity has Create|Update enabled but no properties
marked with [CrudAllow]. Mark every field that should be writable on POST/PUT — or disable
Create/Update via CrudOperations. See https://sharkableio.github.io/docs/autocrud#field-allowlist-with-crudallow
```

### POST and PUT return the persisted row

`POST /` and `PUT /{id}` now re-read the row from the database and return that — not the user-controlled request body. Server-side defaults (timestamps, identity-generated PK, server-set soft-delete state) are visible to the client. If the response JSON doesn't match what you sent in, the server overwrote it deliberately.

### Migration checklist

For every `IAutoCrudEntity<T>` that uses `Create` or `Update`:

1. **Audit every writable column** — is the field intended to be set by the client, or server-managed?
2. **Add `[CrudAllow]`** to client-settable fields. Leave server-set fields (`CreatedAt`, audit columns, etc.) unmarked.
3. **Build and start the app**. If `InvalidOperationException` fires at startup with your entity name, you missed a field or a `Create|Update` endpoint.
4. **If a field should genuinely not be writable**, remove `Create` / `Update` from `AllowedOperations`:

   ```csharp
   CrudOperations IAutoCrudEntity<Product>.AllowedOperations =>
       CrudOperations.List | CrudOperations.Get | CrudOperations.Delete;
   ```
5. **Smoke-test POST/PUT** against the database — confirm that omitted fields stay at their server-side defaults and the response JSON shows the persisted row, not the request body.

Full audit context: [SHARK-SEC-006 in the security disclosure](./security.md).

## Architecture

- **Sharkable core** provides `IAutoCrudEntity<T>` + `CrudOperations` + `IAutoCrudGenerator` + `FilterOperator`
- **Sharkable.AutoCrud.SqlSugar** implements `IAutoCrudGenerator` with SqlSugar ORM
- **AOT preservation** via built-in Source Generator (zero config)
- Future ORM plugins can implement `IAutoCrudGenerator` for other databases (EF Core, Dapper, etc.)
