# 响应缓存配置

为端点组设置 `Cache-Control`（和可选的 `Vary`）头部。与 ETag 和 ASP.NET Output Cache 组合使用。

## 快速开始

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

## 配置

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `DurationSeconds` | `int` | _(必填)_ | `max-age` 秒数 |
| `VaryByHeader` | `string?` | `null` | `Vary` 响应头值 |
| `PrivateOnly` | `bool` | `false` | `true` → `private`，`false` → `public` |
| `ExtraDirectives` | `string?` | `null` | 附加指令（如 `"no-transform"`） |

## AOT

完全 AOT 兼容——使用端点元数据，无反射。
