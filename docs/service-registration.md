# Service Registration

Sharkable supports two styles of automatic dependency injection — **attributes** and **marker interfaces**. Both are scanned at startup and register the class for all its business interfaces (and itself if no base class).

## Available Attributes

| Attribute | Lifetime | Use Case |
|-----------|----------|----------|
| `[ScopedService]` | Scoped | One instance per HTTP request (DbContext, request-scoped caches) |
| `[TransientService]` | Transient | New instance every injection (lightweight, stateless services) |
| `[SingletonService]` | Singleton | Single instance for the application lifetime (configuration, caching, thread-safe services) |

## Marker Interfaces (Alternative)

As an alternative to attributes, implement one of three marker interfaces:

| Interface | Lifetime | 
|-----------|----------|
| `ISingleton` | Singleton |
| `IScoped` | Scoped |
| `ITransient` | Transient |

```csharp
public class UserService : IUserService, IScoped
{
    public Task<User?> GetByIdAsync(int id) => /* ... */;
}
```

The marker interface itself is **not** registered as a service type — only the business interfaces, base class, or the class itself are registered.

Classes must implement **exactly one** marker interface. If a class implements multiple (`IScoped` + `ISingleton`), the first match in priority order wins: `ISingleton` > `IScoped` > `ITransient`.

You can mix attributes and marker interfaces in the same project — both styles are scanned independently.

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

Service registration happens in `AddCommon()` during `AddShark()`:

1. All assemblies collected by Sharkable are scanned for types decorated with `[ScopedService]`, `[TransientService]`, or `[SingletonService]`
2. Assemblies are also scanned for classes implementing `ISingleton`, `IScoped`, or `ITransient`
3. For each type, the scanner finds all concrete assignable implementations
4. Services are registered using `TryAdd()` — if you manually register a service before `AddShark()`, your registration takes precedence
5. Generic type definitions are resolved automatically — concrete closed-generic types are discovered and registered

## Validation

- Attributes can be applied to `Interface` or `Class` targets; marker interfaces can only be implemented on classes
- `AllowMultiple` is `false` for attributes — a class can only have one lifetime attribute. Similarly, prefer implementing exactly one marker interface
- Registration order within each lifetime group is deterministic but should not be relied upon
