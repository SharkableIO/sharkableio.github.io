# Exception Handler

Sharkable provides a built-in global exception handler middleware that converts unhandled exceptions into consistent `UnifiedResult<T>` JSON responses.

## Global Exception Handler

Enabled by default when calling `app.UseShark()`. Catches all unhandled exceptions from endpoints and middleware, maps them to HTTP status codes, and returns a `UnifiedResult<object?>` JSON body.

### Default status code mappings

| Exception type | HTTP status |
|---|---|
| `KeyNotFoundException` | 404 Not Found |
| `UnauthorizedAccessException` | 401 Unauthorized |
| `ArgumentException` | 400 Bad Request |
| Any other exception | 500 Internal Server Error |

### Response format

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

In development mode (`ASPNETCORE_ENVIRONMENT=Development`), the error message includes the full stack trace.

### Production safety

In production (non-Development), the error response defaults to a generic `"An error occurred."` message. The real `Exception.Message` is logged server-side via `ILogger` but never sent to the client. Set `IncludeExceptionMessage = true` to opt back in to sending the raw message:

```csharp
builder.Services.AddShark(opt =>
{
    opt.ExceptionHandlerOptions = new ExceptionHandlerOptions
    {
        IncludeExceptionMessage = true
    };
});
```

This prevents accidental leakage of server paths, SQL query fragments, connection strings, and file-system paths that commonly appear in deep-layer exception messages.

### Custom error mapping

```csharp
app.UseShark(opt => { });

// Or standalone:
app.UseSharkExceptionHandler(opt =>
{
    opt.Map<MyCustomException>(HttpStatusCode.Forbidden);
});
```

### Disable

```csharp
app.UseShark(opt =>
{
    opt.EnableExceptionHandler = false;
});
```
