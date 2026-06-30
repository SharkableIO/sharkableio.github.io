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

## ProblemDetails (RFC 7807)

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

### Custom ProblemDetails Fields

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

## ETag / 304 Not Modified

Sharkable provides opt-in ETag support for GET/HEAD responses:

```csharp
opt.EnableETag = true;
```

### ETag Configuration

```csharp
opt.ETagOptions = new ETagOptions
{
    // HTTP methods eligible for ETag caching. Default: GET, HEAD.
    CacheableMethods = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "GET", "HEAD" },

    // Cache-Control header on ETagged responses. Default: "public, max-age=0, must-revalidate".
    CacheControlHeader = "public, max-age=3600",

    // Predicate to skip caching for certain status codes. Default skips < 200 and >= 300.
    ShouldSkipStatus = status => status is < 200 or >= 300,

    // Paths excluded from ETag processing (prefix match).
    ExcludePaths = ["/healthz", "/openapi", "/scalar", "/_sharkable"],
};
```

## Error Localization

Sharkable supports pluggable error message translation via the `Accept-Language` request header.

### Registration

```csharp
builder.Services.AddShark(opt =>
{
    // Register a custom localizer implementation
    opt.ErrorLocalizerFactory = sp => new MyErrorLocalizer();

    // Default culture when Accept-Language header is missing. Default: "en".
    opt.DefaultCulture = "zh-CN";
});
```

### Implementing IErrorLocalizer

`IErrorLocalizer` is a single-method interface. You can back it with any data source — resx, JSON, XML, YAML, database, or remote API.

#### Option 1: .resx files (standard .NET approach)

Create `.resx` files per culture under `Resources/`:

```
Resources/
├── Messages.resx              (default / invariant)
├── Messages.zh-CN.resx
└── Messages.ja.resx
```

```xml
<!-- Resources/Messages.zh-CN.resx -->
<root>
  <data name="Welcome" xml:space="preserve">
    <value>欢迎</value>
  </data>
  <data name="User_NotFound" xml:space="preserve">
    <value>用户未找到</value>
  </data>
</root>
```

```csharp
public class ResxLocalizer : IErrorLocalizer
{
    private readonly Assembly _assembly;
    private readonly string _baseName = "MyApp.Resources.Messages";

    public ResxLocalizer(Assembly assembly) => _assembly = assembly;

    public string Localize(string key, string culture)
    {
        var rm = new ResourceManager(_baseName, _assembly);
        var value = rm.GetString(key, CultureInfo.GetCultureInfo(culture));
        return value ?? key;
    }
}
```

#### Option 2: JSON file

```json
{
  "Welcome": {
    "en": "Welcome",
    "zh-CN": "欢迎",
    "ja": "ようこそ"
  },
  "User_NotFound": {
    "en": "User not found",
    "zh-CN": "用户未找到",
    "ja": "ユーザーが見つかりません"
  }
}
```

```csharp
public class JsonLocalizer : IErrorLocalizer
{
    private readonly Dictionary<string, Dictionary<string, string>> _messages;

    public JsonLocalizer(string jsonPath)
    {
        var json = File.ReadAllText(jsonPath);
        _messages = JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, string>>>(json)
            ?? [];
    }

    public string Localize(string key, string culture)
    {
        if (_messages.TryGetValue(key, out var cultures) &&
            cultures.TryGetValue(culture, out var message))
            return message;
        return key;
    }
}
```

```csharp
builder.Services.AddShark(opt =>
{
    opt.ErrorLocalizerFactory = _ => new JsonLocalizer("Resources/messages.json");
    opt.DefaultCulture = "en";
});
```

> XML and YAML work the same way — parse the file and look up `[key][culture]`. For database or remote API, inject the client via constructor.

### Using in Your Endpoints

Inject `HttpContext` and call the `.Localize()` extension method:

```csharp
app.MapGet("/hello", (HttpContext ctx) =>
{
    var msg = ctx.Localize("Welcome");
    return Results.Ok(new { message = msg });
});
```

Client sends `Accept-Language: zh-CN` → `{ "message": "欢迎" }`.

The `.Localize()` extension resolves the culture from the `Accept-Language` header automatically. No manual header parsing needed.

### Middleware Integration

The framework middlewares that support localization:
- **Rate limiting** (429) — key: `"RateLimitExceeded"`
- **Graceful shutdown** (503) — key: `"ServerShuttingDown"`

Custom error responses from your own middleware can use the same pattern:

```csharp
app.Use(async (ctx, next) =>
{
    if (someCondition)
    {
        ctx.Response.StatusCode = 400;
        await ctx.Response.WriteAsync(ctx.Localize("CustomError"));
        return;
    }
    await next();
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
