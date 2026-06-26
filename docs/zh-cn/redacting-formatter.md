# 日志脱敏 / Redacting Formatter

Sharkable 提供结构化日志字段脱敏功能，自动屏蔽 `ILogger` 输出中的敏感值。与替换或包装 Logger Provider 不同，它在 DI 层面将默认的 `ILogger<T>` 替换为脱敏包装器——无双重输出，无递归。

## 快速开始

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureRedactingLog(cfg =>
    {
        cfg.RedactFields = ["password", "secret", "token"];
    });
});

var app = builder.Build();
app.UseShark();
```

所有结构化日志调用都会自动扫描匹配配置字段名的值：

```csharp
public class PaymentService(ILogger<PaymentService> logger)
{
    public void ProcessPayment(string email, string password, decimal amount)
    {
        logger.LogInformation(
            "Processing payment for {Email} with password {Password}",
            email, password);
        // 输出: "Processing payment for user@test.com with password ***"
    }
}
```

## 配置

```csharp
opt.ConfigureRedactingLog(cfg =>
{
    // 需要脱敏的字段名（不区分大小写）
    // 默认值: ["password", "secret", "token", "apiKey",
    //          "authorization", "creditCard", "ssn"]
    cfg.RedactFields = ["password", "secret", "token", "apiKey"];

    // 替换文本，默认 "***"
    cfg.RedactWith = "****";
});
```

## 工作原理

1. `ConfigureRedactingLog()` 将 `RedactingLogOptions` 存储到全局配置
2. 在 `AddCommon()` 阶段，将 `ILogger<T>` 的注册替换为 `RedactingLogger<T>`
3. `RedactingLogger<T>` 通过 `ILoggerFactory` 创建内部 `ILogger`，并用 `RedactingLogger` 包装
4. 调用 `Log<TState>()` 时，包装器检测是否为结构化状态（`IReadOnlyList<KeyValuePair<string, object?>>`）
5. 字段名匹配脱敏列表的值会在格式化输出中被替换
6. 替换按值长度降序排列，避免部分值冲突

原始的 `ILoggerProvider` 链（控制台、文件等）不受影响——这只是对每个类收到的 `ILogger<T>` 进行包装。

## 独立注册

你也可以在 `AddShark()` 之外，直接通过 `ILoggingBuilder` 注册：

```csharp
builder.Logging.AddRedactingFormatter(cfg =>
{
    cfg.RedactFields = ["creditCard", "ssn"];
});
```

## AOT 支持

实现完全 AOT 安全。无反射、无 `dynamic`。包装器使用泛型（`ILogger<T>` → `RedactingLogger<T>`）和接口检查（`is IReadOnlyList<KeyValuePair<,>>`），原生 AOT 编译器都能正确处理。

## 脱敏范围

只有结构化日志参数——消息模板中的命名占位符如 `{Password}`——会与脱敏列表比对。非结构化的纯字符串消息透传不变。

脱敏列表按**字段名**匹配，而非值内容。名为 `{Password}` 的字段无论值是什么（短字符串如 `"x"` 或长 token）都会被脱敏。这避免了基于值内容扫描的误报问题。
