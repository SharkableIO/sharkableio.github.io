# 测试工具

独立的 NuGet 包，提供测试替身、工厂连接和断言工具。

## 安装

```bash
dotnet add package Sharkable.Testing
```

## SharkTestFactory

```csharp
public class MyApiTests : SharkTestFactory<Program>
{
    public MyApiTests() : base(opt =>
    {
        opt.ConfigureRateLimiting(r => r.DefaultLimit = 9999);
    })
    { }

    [Fact]
    public async Task Get_Products_ReturnsOk()
    {
        var client = CreateClient();
        var response = await client.GetAsync("/api/products");
        await response.AssertOkAsync(new[] { "item1", "item2" });
    }
}
```

## Fakes

| Fake | 用途 |
|---|---|
| `FakeIdempotencyStore` | 线程安全的内存幂等存储 |
| `FakeRateLimitStore` | 线程安全的内存限流计数器 |

## 断言

```csharp
await response.AssertStatusCode(HttpStatusCode.OK);
await response.AssertOkAsync(new Product { Name = "Widget" });
await response.AssertErrorAsync(HttpStatusCode.NotFound, "Product not found");
```
