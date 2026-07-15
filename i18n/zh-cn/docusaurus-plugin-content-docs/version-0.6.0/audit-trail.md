---
title: 请求日志
---

# 请求日志 / Audit Trail

Sharkable 提供了结构化请求/响应日志中间件，自动记录每个请求的时间、状态和关联 ID。

## 快速开始

在 `AddShark()` 中启用 audit trail：

```csharp
builder.Services.AddShark([typeof(Program).Assembly], opt =>
{
    opt.ConfigureAuditTrail();
});

var app = builder.Build();
app.UseShark();
```

每个请求会输出一条结构化日志：

```
HTTP GET /api/users responded 200 in 45ms [CorrelationId: a1b2c3d4e5f6...]
```

每条响应都会自动添加 `X-Correlation-Id` 头。

## 配置

```csharp
opt.ConfigureAuditTrail(a =>
{
    // 按状态码范围设置日志级别
    a.SuccessLogLevel = LogLevel.Information;  // < 400
    a.WarningLogLevel = LogLevel.Warning;       // 400-499
    a.ErrorLogLevel = LogLevel.Error;           // >= 500

    // 跳过健康检查、OpenAPI 等不需要审计的路径
    a.ExcludePaths = ["/healthz", "/openapi", "/scalar"];

    // 脱敏敏感请求头
    a.RedactHeaders = ["Authorization", "X-Api-Key", "Cookie"];

    // 脱敏敏感查询参数
    a.RedactQueryParams = ["token", "api_key", "secret"];

    // 是否在日志中包含查询字符串（默认 true）
    a.IncludeQueryString = true;

    // Correlation ID 的请求头名称（默认 X-Correlation-Id）
    a.CorrelationIdHeader = "X-Correlation-Id";

    // 是否转发 incoming 的 Correlation ID（默认 true）
    a.ForwardCorrelationId = true;
});
```

## Correlation ID（关联 ID）

每条响应都会设置 `X-Correlation-Id` 头：

- **转发**：如果 incoming 请求已携带 `X-Correlation-Id`，则复用该值
- **生成**：否则自动生成新的 UUID
- **全局唯一**：每个请求获得唯一的 Correlation ID

这使得跨服务追踪请求和关联日志变得非常简单。

## 响应头

每个被审计的响应都会包含 `X-Correlation-Id` 头：

```
HTTP/1.1 200 OK
X-Correlation-Id: a1b2c3d4e5f67890abcdef1234567890
Content-Type: application/json
```

被排除路径的响应**不会**包含 `X-Correlation-Id` 头。

## 异步 / 批量写入

对于高吞吐量端点，启用异步即发即忘日志记录以避免阻塞响应：

```csharp
opt.ConfigureAuditTrail(a =>
{
    a.AsyncWrite = true;

    // 刷新前最多积压的条目数。默认 100。
    a.BatchSize = 100;

    // 刷新部分批次前的最长等待间隔。默认 5s。
    a.FlushInterval = TimeSpan.FromSeconds(5);

    // 关闭时自动刷新剩余条目。默认 true。
    a.EnsureFlushOnShutdown = true;
});
```

当 `AsyncWrite` 为 `true` 时：
- 日志条目写入有界 `Channel<AuditLogEntry>`（容量 4096）
- 后台处理器批量写入日志
- 关闭时自动刷新剩余条目
- Channel 满时丢弃新条目（`DropWrite`）—— 应用永远不会因审计日志而阻塞

当 `AsyncWrite` 为 `false`（默认）时，每个请求通过 `ILogger` 同步写入 —— 即原始行为。

## 日志格式预设

通过 `AuditTrailOptions.LogFormat` 选择日志输出风格：

```csharp
opt.ConfigureAuditTrail(a =>
{
    a.LogFormat = AuditTrailFormat.JsonStyle;
});
```

| 格式 | 输出示例 |
|------|----------|
| `Default` | `HTTP GET /api/users responded 200 in 45ms [CorrelationId: ...] Headers={...}` |
| `DotnetLogger` | `GET /api/users => 200 in 45ms [...] Headers={...}` |
| `JsonStyle` | `{"method":"GET","path":"/api/users","statusCode":200,...}` |
| `Compact` | `GET /api/users 200 45ms` |

选择 `Default` 时，日志输出使用结构化日志的命名占位符（`{Method}`、`{Path}`、`{StatusCode}` 等），便于日志聚合工具处理。其他格式使用单个 `{Message}` 模板。

## AOT 兼容

审计日志中间件完全 AOT 兼容。它使用 `ILogger<T>` 进行结构化日志记录，不对请求/响应体进行任何反射操作。
