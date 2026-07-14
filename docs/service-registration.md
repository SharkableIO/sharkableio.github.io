# Service Registration

Sharkable supports attribute-based dependency injection — mark your classes with `[ScopedService]`, `[TransientService]`, or `[SingletonService]` and they are automatically registered at startup.

## Available Attributes

| Attribute | Lifetime | Use Case |
|-----------|----------|----------|
| `[ScopedService]` | Scoped | One instance per HTTP request (DbContext, request-scoped caches) |
| `[TransientService]` | Transient | New instance every injection (lightweight, stateless services) |
| `[SingletonService]` | Singleton | Single instance for the application lifetime (configuration, caching, thread-safe services) |

## Usage

Simply decorate your implementation class:

```csharp
[ScopedService]
public class UserService
{
    public Task<User?> GetByIdAsync(int id) => /* ... */;
}
```

The framework scans all registered assemblies during `AddShark()` and registers:

- **All interfaces** the class implements → each interface resolves to the same instance (scoped lifetime)
- **The class itself** if it has no interfaces (or base type is `object`)
- **The base type** if it inherits from a non-object base

```csharp
// Registration is automatic — no manual builder.Services.Add*() needed
builder.Services.AddShark([typeof(Program).Assembly]);
```

### With interface

```csharp
public interface IProductService
{
    Product? Get(int id);
}

[ScopedService]
public class ProductService : IProductService
{
    public Product? Get(int id) => /* ... */;
}

// Injects via the interface
public class MyEndpoint : ISharkEndpoint
{
    private readonly IProductService _products;
    public MyEndpoint(IProductService products) => _products = products;
}
```

### Self-registered (no interface)

```csharp
[SingletonService]
public class AppConfiguration
{
    public string StoragePath { get; set; } = "./data";
}

// Injected directly
public class MyEndpoint(IConfiguration config, AppConfiguration appConfig) : ISharkEndpoint;
```

### Base type registration

```csharp
public abstract class BaseRepository
{
    protected string ConnectionString { get; }
}

[ScopedService]
public class UserRepository : BaseRepository
{
    public User? Find(int id) => /* ... */;
}

// BaseRepository and UserRepository interfaces are both registered
// Injecting BaseRepository returns UserRepository
```

## Registration Details

Attribute processing happens in `AddCommon()` during `AddShark()`:

1. All assemblies collected by Sharkable are scanned for types decorated with `[ScopedService]`, `[TransientService]`, or `[SingletonService]`
2. For each decorated type, the scanner finds all concrete assignable implementations
3. Services are registered using `TryAdd()` — if you manually register a service before `AddShark()`, your registration takes precedence
4. Generic type definitions are resolved automatically — concrete closed-generic types are discovered and registered

## Validation

- Attributes can be applied to `Interface` or `Class` targets
- `AllowMultiple` is `false` — a class can only have one lifetime attribute
- Registration order within each lifetime group is deterministic but should not be relied upon
