# Exception Handler & Auto Unified Response

Sharkable provides a built-in global exception handler middleware that converts unhandled exceptions into consistent `UnifiedResult<T>` JSON responses, plus an optional auto-wrap filter that wraps endpoint return values in `UnifiedResult<T>` automatically.

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

## Auto UnifiedResult Wrapping (opt-in)

When enabled, endpoint return values that are not `IResult` are automatically wrapped in `UnifiedResult<T>`.

```csharp
app.UseShark(opt =>
{
    opt.EnableAutoWrap = true;
});
```

```csharp
// Before: returns raw string
app.MapGet("hello", () => "world");

// After (with EnableAutoWrap = true):
// Response: { "statusCode": 200, "data": "world", ... }
```

> **Note:** Auto-wrap uses reflection and `MakeGenericType` — it works in AOT mode only if the concrete `UnifiedResult<T>` types are registered via `[JsonSerializable]` in your `JsonSerializerContext`.
