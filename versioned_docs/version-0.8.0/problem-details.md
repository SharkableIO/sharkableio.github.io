# ProblemDetails (RFC 7807)

Sharkable supports RFC 7807 ProblemDetails as an alternative error response format. Enable with one flag:

```csharp
opt.UseProblemDetails = true;
```

When enabled, all error responses switch from the unified result envelope to `application/problem+json`:

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

## Custom ProblemDetails Fields

The `type` URI and `title` are customizable via factory delegates:

```csharp
opt.ProblemDetailsTypeFactory = status => $"https://example.com/errors/{status}";
opt.ProblemDetailsTitleFactory = status => status switch
{
    400 => "Bad Request",
    404 => "Not Found",
    _ => "Error"
};
```
