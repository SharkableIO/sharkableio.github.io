---
title: AutoCrud 自动 API 生成
---

# AutoCrud 自动 API 生成

Sharkable 通过 `IAutoCrudEntity<T>` 标记接口提供自动 CRUD API 生成。在任意 `ISharkEndpoint` 类上实现此接口，即可自动生成安全的 CRUD 操作——默认分页，无需额外配置。

## 快速开始

### 1. 安装插件

```bash
dotnet add package Sharkable.AutoCrud.SqlSugar
```

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
    // 空 — 安全 CRUD 自动生成（分页，无全量 dump）
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

`pageSize` 上限 100。不认识的字段自动忽略。

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
// 现在 GET /?all=true 返回全表
```

`ListAll` 故意排除在 `All` 之外——大表全量 dump 有风险。

## 自定义覆盖

在 `AddRoutes()` 中编写自己的路由——优先于自动生成：

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

## 架构

- **Sharkable 核心**提供 `IAutoCrudEntity<T>` + `CrudOperations` + `IAutoCrudGenerator`
- **Sharkable.AutoCrud.SqlSugar** 实现 `IAutoCrudGenerator`（基于 SqlSugar ORM）
- 未来 ORM 插件可实现 `IAutoCrudGenerator` 接入其他数据库（EF Core、Dapper 等）
