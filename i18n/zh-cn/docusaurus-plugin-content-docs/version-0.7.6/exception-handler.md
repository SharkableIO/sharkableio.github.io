---
title: 异常处理器
---

# 异常处理器

Sharkable 内置了全局异常处理中间件，能将未处理的异常转换为统一的 `UnifiedResult<T>` JSON 响应。

## 全局异常处理器

调用 `app.UseShark()` 时默认启用。会捕获端点和中间件中所有未处理的异常，映射为 HTTP 状态码，并返回 `UnifiedResult<object?>` JSON 响应。

### 默认状态码映射

| 异常类型 | HTTP 状态码 |
|---|---|
| `KeyNotFoundException` | 404 Not Found |
| `UnauthorizedAccessException` | 401 Unauthorized |
| `ArgumentException` | 400 Bad Request |
| 其他异常 | 500 Internal Server Error |

### 响应格式

```json
{
  "StatusCode": 404,
  "Data": null,
  "ErrorMessage": "user not found",
  "Extra": null,
  "TimeStamp": 1780881487673,
  "Result": null
}
```

在开发模式（`ASPNETCORE_ENVIRONMENT=Development`）下，错误信息会包含完整堆栈跟踪。

### 生产环境安全

在生产环境（非 Development）中，错误响应默认返回通用 `"An error occurred."` 消息。真实的 `Exception.Message` 仅通过 `ILogger` 记录在服务端，绝不发送给客户端。如需恢复发送原始消息，设置 `IncludeExceptionMessage = true`：

```csharp
builder.Services.AddShark(opt =>
{
    opt.ExceptionHandlerOptions = new ExceptionHandlerOptions
    {
        IncludeExceptionMessage = true
    };
});
```

这可以防止意外泄露深层异常中常见的服务器路径、SQL 查询片段、连接字符串和文件系统路径。

### 自定义错误映射

```csharp
app.UseShark(opt => { });

// 或单独使用：
app.UseSharkExceptionHandler(opt =>
{
    opt.Map<MyCustomException>(HttpStatusCode.Forbidden);
});
```

### 禁用

```csharp
app.UseShark(opt =>
{
    opt.EnableExceptionHandler = false;
});
```
