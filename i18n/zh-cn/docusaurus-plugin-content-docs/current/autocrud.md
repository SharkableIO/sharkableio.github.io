---
title: AutoCrud 自动 API 生成
---

# AutoCrud 自动 API 生成

Sharkable 通过 `IAutoCrudEntity<T>` 标记接口提供自动 CRUD API 生成。在任意 `ISharkEndpoint` 类上实现此接口，即可自动生成全部五项 CRUD 操作——无需额外配置。

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
    // 空 — 全部 5 项 CRUD 操作自动生成
}
```

**自动生成的路由**（`api/product`）：

| 方法 | 路由 | 操作 |
|------|------|------|
| `GET` | `/` | 列表 |
| `GET` | `/{id}` | 按主键查询 |
| `POST` | `/` | 新增 |
| `PUT` | `/{id}` | 更新 |
| `DELETE` | `/{id}` | 删除 |

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

可用标志：`None`、`List`、`Get`、`Create`、`Update`、`Delete`、`All`。

## 自定义覆盖

在 `AddRoutes()` 中编写自己的路由——优先于自动生成：

```csharp
public class ProductEndpoint : ISharkEndpoint, IAutoCrudEntity<Product>
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        // 带过滤的自定义列表
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

## 健康检查

`EnableHealthChecks = true` 时，SqlSugar 连接状态自动纳入 `/healthz`。

## 架构

- **Sharkable 核心**提供 `IAutoCrudEntity<T>` + `CrudOperations` + `IAutoCrudGenerator`
- **Sharkable.AutoCrud.SqlSugar** 实现 `IAutoCrudGenerator`（基于 SqlSugar ORM）
- 未来 ORM 插件可实现 `IAutoCrudGenerator` 接入其他数据库（EF Core、Dapper 等）
