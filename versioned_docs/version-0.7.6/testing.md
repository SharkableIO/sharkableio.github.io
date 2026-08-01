# Testing

Separate NuGet package providing test doubles, factory wiring, and assertion helpers for Sharkable applications.

## Installation

```bash
dotnet add package Sharkable.Testing
```

## SharkTestFactory

Base `WebApplicationFactory<TEntryPoint>` that auto-wires Sharkable configuration into integration tests.

```csharp
public class MyApiTests : SharkTestFactory<Program>
{
    public MyApiTests() : base(opt =>
    {
        // Override request-time options here
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

:::note
Options that control DI registration (e.g., `EnableIdempotency`, `EnableETag`, `EnableHealthChecks`) are consumed during the entry point's `AddShark()` and will NOT reflect test-factory overrides. Configure these in your entry point's `Program.cs` or via `ConfigureTestServices`.
:::

## Fakes

### FakeIdempotencyStore

Thread-safe in-memory store. No TTL — records persist until `Clear()` is called.

```csharp
builder.Services.AddSingleton<IIdempotencyStore, FakeIdempotencyStore>();
```

### FakeRateLimitStore

Thread-safe in-memory counter store. No expiration.

```csharp
builder.Services.AddSingleton<IDistributedRateLimitStore, FakeRateLimitStore>();

// In tests:
var store = services.GetRequiredService<IDistributedRateLimitStore>() as FakeRateLimitStore;
Assert.Equal(5, store.GetCount("key"));
```

## Assertions

```csharp
// Assert status code
response.AssertStatusCode(HttpStatusCode.OK);

// Deserialize and assert unified result
var result = await response.ReadAsUnifiedResultAsync<Product>();
Assert.Equal("Widget", result.Data.Name);

// Assert successful response with expected data
await response.AssertOkAsync(new Product { Name = "Widget" });

// Assert error response
await response.AssertErrorAsync(HttpStatusCode.NotFound, "Product not found");
```

| Method | Description |
|---|---|
| `AssertStatusCode(expected)` | Asserts HTTP status code |
| `ReadAsUnifiedResultAsync<T>()` | Deserializes body as `UnifiedResult<T>` |
| `AssertOkAsync<T>(expected)` | Asserts 200 + matching data + no error |
| `AssertErrorAsync(status, substring)` | Asserts status + error message contains substring |
