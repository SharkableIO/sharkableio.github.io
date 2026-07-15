# 服务注册

Sharkable 支持基于属性的依赖注入——使用 `[ScopedService]`、`[TransientService]` 或 `[SingletonService]` 标记类，启动时自动注册。

## 可用属性

| 属性 | 生命周期 | 适用场景 |
|------|----------|----------|
| `[ScopedService]` | Scoped | 每次 HTTP 请求一个实例（DbContext、请求级缓存） |
| `[TransientService]` | Transient | 每次注入一个新实例（轻量、无状态服务） |
| `[SingletonService]` | Singleton | 整个应用生命周期一个实例（配置、缓存、线程安全服务） |

## 用法

直接在实现类上标记属性：

```csharp
[ScopedService]
public class UserService
{
    public Task<User?> GetByIdAsync(int id) => /* ... */;
}
```

框架在 `AddShark()` 期间扫描所有注册的程序集，自动注册：

- **类实现的所有接口** → 每个接口解析到同一个实例（Scoped 生命周期）
- **类自身**（如果没有任何接口，或基类是 `object`）
- **基类型**（如果继承自非 object 基类）

```csharp
// 自动注册——无需手动 builder.Services.Add*()
builder.Services.AddShark([typeof(Program).Assembly]);
```

### 配合接口使用

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

// 通过接口注入
public class MyEndpoint : ISharkEndpoint
{
    private readonly IProductService _products;
    public MyEndpoint(IProductService products) => _products = products;
}
```

### 自注册（无接口）

```csharp
[SingletonService]
public class AppConfiguration
{
    public string StoragePath { get; set; } = "./data";
}

// 直接注入
public class MyEndpoint(IConfiguration config, AppConfiguration appConfig) : ISharkEndpoint;
```

### 基类型注册

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

// 同时注册了 BaseRepository 和 UserRepository 的接口
// 注入 BaseRepository 返回 UserRepository 实例
```

## 注册细节

属性处理在 `AddShark()` 期间的 `AddCommon()` 中完成：

1. Sharkable 收集的所有程序集被扫描，查找标记了 `[ScopedService]`、`[TransientService]` 或 `[SingletonService]` 的类型
2. 对每个标记类型，扫描器查找所有可赋值的具体实现
3. 使用 `TryAdd()` 注册——如果在 `AddShark()` 之前手动注册了服务，则手动注册优先
4. 泛型类型定义自动解析——发现并注册具体的封闭泛型类型

## 验证

- 属性可应用于 `Interface` 或 `Class` 目标
- `AllowMultiple` 为 `false`——一个类只能有一个生命周期属性
- 每个生命周期组内的注册顺序是确定的，但不应该依赖此顺序
