---
title: AutoCrud 自动 API 生成
---

# AutoCrud 自动 API 生成

Sharkable 通过 `IAutoCrudEntity<T>` 标记接口提供自动 CRUD API 生成。在任意 `ISharkEndpoint` 类上实现此接口，即可自动生成安全的 CRUD 操作——默认分页，无需额外配置。

## 为什么选择 SqlSugar

Sharkable.AutoCrud 基于 [SqlSugar](https://github.com/DotNetNext/SqlSugar) — 一款轻量高性能 .NET ORM：

| | |
|---|---|
| **开源协议** | MIT — 无限制，商业友好 |
| **数据库支持** | MySQL、SQL Server、PostgreSQL、SQLite、Oracle、MariaDB、达梦、人大金仓、瀚高、GaussDB、DuckDB、MongoDB、QuestDB、ClickHouse、OceanBase、DB2、HANA、TDSQL、ODBC |
| **性能** | 接近原生 ADO.NET — 多项基准测试快于 EF Core |
| **AOT 支持** | `StaticConfig.EnableAot = true` — .NET Native AOT 兼容 |
| **零追踪开销** | 查询默认返回普通 POCO 对象，无变更追踪成本 |
| **LINQ + Lambda + SQL** | 完整 LINQ 支持（`Where/OrderBy/Select`），同时支持原生 SQL |
| **Code-first / DB-first** | 实体自动迁移，或从已有数据库反向生成 |
| **多租户** | 内置 `SugarTenant` 表/库级别隔离 |
| **分表分库** | 原生支持水平分片 |
| **种子数据** | 内置数据填充器，方便测试/演示 |

以上特性在 Sharkable.AutoCrud 中无需额外配置——生成器将 `IAutoCrudEntity<T>` 直接映射到 SqlSugar 的 `Queryable<T>/Insertable<T>/Updateable<T>/Deleteable<T>` API。

## 快速开始

### 1. 安装插件

```bash
dotnet add package Sharkable.AutoCrud.SqlSugar
```

该包实现了 `ISharkPlugin`，启动时**自动发现**——无需手动注册。只需引用包并配置数据库连接。

### 2. 配置数据库

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

### 3. 定义实体 + 端点

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
    // 无需 AddRoutes — AutoCrud 自动生成所有路由
}
```

**自动生成的路由**（`api/product`）：

| 方法 | 路由 | 操作 | 描述 |
|------|------|------|------|
| `GET` | `/` | 分页列表 | `?page=1&pageSize=20` → `{items,total,page,pageSize,totalPages}` |
| `GET` | `/{id}` | 按主键查询 | 单条实体 |
| `POST` | `/` | 新增 | 请求体 = 实体 |
| `PUT` | `/{id}` | 更新 | 请求体 = 实体 |
| `DELETE` | `/{id}` | 删除 | 按主键 |

## 分页

`List` 默认返回分页结果，无需额外配置：

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

默认每页 20 条，上限 100 条。可通过 `SqlSugarOptions` 配置：

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

不认识的字段自动忽略。

## 屏蔽操作

通过 `AllowedOperations` 选择性禁用 CRUD 操作：

```csharp
public class ReadOnlyEndpoint : ISharkEndpoint, IAutoCrudEntity<Product>
{
    CrudOperations IAutoCrudEntity<Product>.AllowedOperations =>
        CrudOperations.List | CrudOperations.Get;
    // POST、PUT、DELETE 已禁用
}
```

可用标志：`None`、`List`、`Get`、`Create`、`Update`、`Delete`、`ListAll`、`All`。

> `All = List | Get | Create | Update | Delete` — **不包含 `ListAll`**。全量 dump 需显式打开以确保安全。

### 启用全量导出

```csharp
CrudOperations IAutoCrudEntity<Product>.AllowedOperations =>
    CrudOperations.All | CrudOperations.ListAll;
// 现在 GET /all 返回全表
```

`ListAll` 故意排除在 `All` 之外——大表全量 dump 有风险。

## 自定义覆盖

在 `AddRoutes()` 中编写自己的路由——优先于自动生成。`AddRoutes` 为可选（默认空实现）：

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
    // 查询、新增、更新、删除仍自动生成
}
```

## 搜索与过滤

`List` 操作支持 `filter[field][op]=value` 查询参数，同时支持排序和分页。

```
GET /api/product?filter[price][gte]=100&filter[price][lte]=500&filter[name][like]=Widget%&sort=-price&page=1&pageSize=20
```

### 操作符

| 键 | SQL | 示例 |
|----|-----|------|
| *(无 op)* | `=` | `?filter[name]=Widget` |
| `eq` | `=` | `?filter[name][eq]=Widget` |
| `ne` | `<>` | `?filter[price][ne]=0` |
| `gt` / `gte` | `>` / `>=` | `?filter[price][gte]=100` |
| `lt` / `lte` | `<` / `<=` | `?filter[price][lte]=500` |
| `like` | `LIKE` | `?filter[name][like]=Widget%` |
| `in` / `nin` | `IN` / `NOT IN` | `?filter[status][in]=active,pending` |
| `null` | `IS NULL` | `?filter[deleted][null]=true` |

### 排序

`?sort=field`（升序），`?sort=-field`（降序），`?sort=-price,+name`（多字段）。

### 安全

未知字段自动忽略。所有值参数化。

### 前端示例

```javascript
const params = new URLSearchParams({
  'filter[price][gte]': 100,
  'filter[name][like]': 'Widget%',
  sort: '-price'
});
fetch(`/api/product?${params}`);
```

## 健康检查

`EnableHealthChecks = true` 时，SqlSugar 连接状态自动纳入 `/healthz`：

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

## 软删除

实体标记 `ISoftDeletable` 后，AutoCrud 自动处理软删除——无需代码改动：

```csharp
public class Product : ISoftDeletable
{
    public int Id { get; set; }
    public bool IsDeleted { get; set; }  // 约定式检测
}
```

**行为变化**：

| 操作 | 未标记 ISoftDeletable | 已标记 ISoftDeletable |
|------|----------------------|----------------------|
| List / Get / ListAll | 所有行 | 仅 `WHERE IsDeleted = 0` |
| Delete | 物理删除 | `UPDATE SET IsDeleted = 1`（软删除） |

`IsDeleted` 属性按名称检测（不区分大小写）。无需特性配置、无需额外代码。

可通过 `SqlSugarOptions` 自定义字段名：

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
    public bool IsRemoved { get; set; }  // 自定义字段名
}
```

## AOT 支持（零 rd.xml）

.NET Native AOT 发布要求所有类型在编译时已知——trimmer 会移除未引用的类型。通常 SqlSugar 实体需要手写 `rd.xml` 才能保留。

Sharkable 内置 Source Generator，扫描所有 `IAutoCrudEntity<T>` 实现并发出 `typeof(T)` 引用——强制 trimmer 保留实体类型。**无需 rd.xml。**

```bash
dotnet publish -c Release -r linux-x64 --self-contained
# 实体类型自动保留
```

依赖 Sharkable ≥ 0.4.1 的任意 `Sharkable.AutoCrud.SqlSugar` 版本均可使用。

## 多租户行隔离

SaaS 式部署场景下，AutoCrud 可自动隔离各租户的数据行——查询按当前租户过滤，写入自动打上租户标签。**仅限主动开启**：默认关闭；关闭时行为与基线完全一致。

### 1. 启用过滤

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableAutoCrudTenantFilter = true;   // opt-in
    opt.AutoCrudTenantColumn = "TenantId";   // 默认值；列名不同时覆盖

    opt.ConfigureMultiTenant(cfg =>
    {
        cfg.ResolveTenant = ctx => ctx.Request.Headers["X-Tenant-Id"].ToString();
    });
});
```

### 2. 给实体加租户列

```csharp
[SugarTable("orders")]
public class Order
{
    [SugarColumn(IsPrimaryKey = true, IsIdentity = true)]
    public int Id { get; set; }

    [CrudAllow]
    public string Name { get; set; } = "";

    // 租户列——不加 [CrudAllow]：生成器会把它排除在客户端可写列之外。
    // 设为可空，保证过滤关闭时插入也能成功。
    [SugarColumn(IsNullable = true)]
    public string? TenantId { get; set; }
}
```

### 过滤行为一览

| 操作 | 启用过滤后的行为 |
|---|---|
| 列表 / 全部 / 按 ID 查 | 自动加 `WHERE TenantId = @tenantId`；跨租户 ID → 404 |
| 创建 | 租户列由服务端强制填充；客户端提供的值永远无效 |
| 更新 | 归属预读（跨租户 → 404）；租户列排除在可写列之外 |
| 删除 | 软删/硬删均带 `AND TenantId = @tenantId`——跨租户删除影响 0 行 |
| 任何未解析到租户的请求 | **400** —— 失败关闭，绝不无租户查询 |

租户列名在端点生成时按 SQL 标识符校验（非法名称启动即抛错），所有租户值均以 SQL 参数传递。

### 说明

- 启用过滤时，表中必须存在租户列。
- 空/纯空白租户解析结果会被框架视为"无租户"。
- 该功能适用于任意 `ITenant` 解析策略（请求头、声明、域名、JWT——见[多租户](./multi-tenant.md)）。

## 架构

- **Sharkable 核心**提供 `IAutoCrudEntity<T>` + `CrudOperations` + `IAutoCrudGenerator` + `FilterOperator`
- **Sharkable.AutoCrud.SqlSugar** 实现 `IAutoCrudGenerator`（基于 SqlSugar ORM）
- **AOT 保留** 通过内置 Source Generator（零配置）
- 未来 ORM 插件可实现 `IAutoCrudGenerator` 接入其他数据库（EF Core、Dapper 等）
