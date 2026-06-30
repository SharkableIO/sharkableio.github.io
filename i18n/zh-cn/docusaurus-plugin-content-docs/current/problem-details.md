---
title: ProblemDetails（RFC 7807）
---

# ProblemDetails（RFC 7807）

Sharkable 支持 RFC 7807 ProblemDetails 作为备选错误响应格式。一行启用：

```csharp
opt.UseProblemDetails = true;
```

启用后，所有错误响应从统一结果封包切换为 `application/problem+json`：

```json
{
  "type": "https://httpstatuses.com/404",
  "title": "Not Found",
  "status": 404,
  "detail": "user not found",
  "instance": "/api/users/42",
  "traceId": "c8a0f6e4-9b2d-4f1a-b3c7-2e5d8a1f0b6c"
}
```

## 自定义 ProblemDetails 字段

`type` URI 和 `title` 可通过工厂委托自定义：

```csharp
opt.ProblemDetailsTypeFactory = status => $"https://example.com/errors/{status}";
opt.ProblemDetailsTitleFactory = status => status switch
{
    400 => "Bad Request",
    404 => "Not Found",
    _ => "Error"
};
```
