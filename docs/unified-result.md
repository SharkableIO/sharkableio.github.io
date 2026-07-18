# Unified Result

Sharkable provides a pluggable unified result system to ensure consistent API response formats across all endpoints.

## Overview

The unified result system has three layers:

1. **`IUnifiedResult`** — marker interface that defines the shape of a unified response (`StatusCode`, `Data`, `ErrorMessage`)
2. **`UnifiedResult<T>`** — default implementation included in the library
3. **`IUnifiedResultFactory`** — factory that creates result instances; replace it to use your own format

## Default usage

```csharp
// Create a result manually
var result = new UnifiedResult<string>("hello");
// { "statusCode": 200, "data": "hello", "errorMessage": null, ... }

// With status code
var error = new UnifiedResult<string>(null, "not found", HttpStatusCode.NotFound);
```

## Extension methods

Extension methods on `string?` (error-based) and `T?` (data-based) let you return typed HTTP responses with consistent `UnifiedResult<T>` wrapping.

### Data/error wrappers

```csharp
// Wrap data in UnifiedResult<T> as IResult (200)
return data.AsOkResult();
// null → Results.Ok(), non-null → Results.Ok(UnifiedResult<T>)

// Wrap data in UnifiedResult<T> with status code (201)
return data.AsCreated(uri: "/api/items/1");
// null → 204 No Content, with uri → Results.Created(), no uri → Results.Ok()

// Wrap data in UnifiedResult<T> with status code (202)
return data.AsAccepted(uri: "/api/jobs/42");
// null → 202 No Content, with uri → Results.Accepted(), no uri → 202 + body
```

### Error responses (200+ coverage)

```csharp
return "message".AsBadRequest();          // 400 Bad Request
return "expired".AsUnauthorized();        // 401 Unauthorized
return "forbidden".AsForbidden();         // 403 Forbidden
return "not found".AsNotFound();          // 404 Not Found
return "conflict".AsConflict();           // 409 Conflict
return "not allowed".AsMethodNotAllowed();    // 405 Method Not Allowed
return "not acceptable".AsNotAcceptable();    // 406 Not Acceptable
return "gone".AsGone();                       // 410 Gone
return "bad media".AsUnsupportedMediaType();  // 415 Unsupported Media Type
return "invalid".AsUnprocessableEntity();     // 422 Unprocessable Entity
return "rate limited".AsTooManyRequests();    // 429 Too Many Requests
return "server error".AsInternalServerError();// 500 Internal Server Error
return "not impl".AsNotImplemented();         // 501 Not Implemented
return "bad gateway".AsBadGateway();          // 502 Bad Gateway
return "unavailable".AsServiceUnavailable();  // 503 Service Unavailable
return "timeout".AsGatewayTimeout();          // 504 Gateway Timeout
```

All error extensions share the same pattern — `null` input returns a bare status response, non-null error wraps it in `UnifiedResult<string>`:

```csharp
return errorString.AsNotFound();      // { "statusCode": 404, "data": null, "errorMessage": "not found", ... }
string? nullError = null;
return nullError.AsNotFound();        // bare 404, no body
```

### Generic custom status

```csharp
// Error with arbitrary HttpStatusCode
return "error".AsStatus(HttpStatusCode.FailedDependency);

// Data with arbitrary HttpStatusCode
return data.AsStatus(HttpStatusCode.ExpectationFailed, errors: "optional");
```

## Static factories (`UnifiedResult.*`)

All extension methods above have equivalent static factories on the non-generic `UnifiedResult` class:

```csharp
// 2xx Success
UnifiedResult.Ok(data, errors: null);                            // 200
UnifiedResult.Created(data, uri: "/items/1");                    // 201
UnifiedResult.Accepted(data, uri: "/jobs/42");                   // 202
UnifiedResult.NoContent();                                       // 204

// 4xx Client errors
UnifiedResult.BadRequest("message");          // 400
UnifiedResult.Unauthorized();                 // 401
UnifiedResult.Forbidden();                   // 403
UnifiedResult.NotFound("message");           // 404
UnifiedResult.MethodNotAllowed("msg");        // 405
UnifiedResult.NotAcceptable("msg");           // 406
UnifiedResult.Conflict("message");           // 409
UnifiedResult.Gone("message");               // 410
UnifiedResult.UnsupportedMediaType("msg");    // 415
UnifiedResult.UnprocessableEntity("msg");     // 422
UnifiedResult.TooManyRequests("msg");         // 429

// 5xx Server errors
UnifiedResult.InternalServerError("msg");     // 500
UnifiedResult.NotImplemented("msg");          // 501
UnifiedResult.BadGateway("msg");              // 502
UnifiedResult.ServiceUnavailable("msg");      // 503
UnifiedResult.GatewayTimeout("msg");          // 504

// Generic custom status
UnifiedResult.Status(data, HttpStatusCode.FailedDependency, errors: "msg");  // arbitrary
```

Static factories return `IResult`, identical behavior to the extension methods.

## Auto-wrap (default on)

`EnableAutoWrap` is enabled by default. All plain return values — anything not `IResult` or `IUnifiedResult` — are automatically wrapped in `UnifiedResult<T>`:

```csharp
// No configuration needed — auto-wrap is on by default
app.MapGet("hello", () => "world");
// Response: { "statusCode": 200, "data": "world", "errorMessage": null, ... }

app.MapGet("users", (DbContext db) => db.Users.ToList());
// Response: { "statusCode": 200, "data": [...], ... }
```

Handlers that return `IResult` (e.g., `Results.NotFound()`, `UnifiedResult.BadRequest()`, `.AsNotFound()`) are never modified — auto-wrap skips them.

### Disabling auto-wrap

**Globally** — in `AddShark()`:

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableAutoWrap = false;
});
```

**Per endpoint class** — apply `[SharkDontWrap]` to the `ISharkEndpoint` class:

```csharp
[SharkDontWrap]
public class StreamingEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("download", () => new FileStreamResult(...)); // raw response, no wrapping
    }
}
```

**Per route** — use `.DisableAutoWrap()`:

```csharp
app.MapGet("plain-text", () => "raw string").DisableAutoWrap();
```

> **Note:** When auto-wrap is disabled, the raw return value is passed through unchanged — ensure your serializer supports the type.

## Custom result format

Implement `IUnifiedResult` and `IUnifiedResultFactory` to use your own response format:

```csharp
public class MyResult : IUnifiedResult
{
    public int Code { get; set; }
    public object? Info { get; set; }
    public string? Error { get; set; }

    int IUnifiedResult.StatusCode => Code;
    object? IUnifiedResult.Data => Info;
    string? IUnifiedResult.ErrorMessage => Error;
}

public class MyResultFactory : IUnifiedResultFactory
{
    public IUnifiedResult Create(object? data, string? errorMessage, int statusCode)
        => new MyResult { Code = statusCode, Info = data, Error = errorMessage };
}
```

Register the factory in `AddShark()`:

```csharp
builder.Services.AddShark(opt =>
{
    opt.UnifiedResultFactory = new MyResultFactory();
});
```

Now all exception handler responses and auto-wrap results will use `MyResult` format.

> **Important:** When using a custom response format with `EnableAutoWrap`, the OpenAPI document transformer still generates the default `UnifiedResult<T>` schema shape. To make the generated OpenAPI document match your actual response structure, set `WrapSchemaFactory`. **If you replace `IUnifiedResultFactory` without also setting `WrapSchemaFactory`, the OpenAPI schema will not reflect your custom response shape — a startup warning is generated to alert you of the mismatch.**

```csharp
builder.Services.AddShark(opt =>
{
    opt.UnifiedResultFactory = new MyResultFactory();
    opt.EnableAutoWrap = true;
    opt.WrapSchemaFactory = (original) => new OpenApiSchema
    {
        Type = JsonSchemaType.Object,
        Properties = new Dictionary<string, IOpenApiSchema>
        {
            ["code"] = new OpenApiSchema { Type = JsonSchemaType.Integer },
            ["info"] = original,
            ["error"] = new OpenApiSchema { Type = JsonSchemaType.String },
        },
    };
});
```

This requires `using Microsoft.OpenApi;` in your Program.cs.

## AOT support

Sharkable ships a Source Generator that automatically preserves `UnifiedResult<T>` types for all endpoint return values — **no `JsonSerializerContext` needed**:

```csharp
app.MapGet("/users", () => new UserDto { Name = "Alice" });
app.MapGet("/orders", () => new OrderDto { Id = 1 });
// UnifiedResult<UserDto> + UnifiedResult<OrderDto> auto-preserved at compile time
```

The SG scans all `MapGet/Post/Put/Patch/Delete` delegates, extracts return types, and emits `typeof(UnifiedResult<T>)` references. Combined with the AutoCrud AOT preserver, all entity types and unified result types survive Native AOT trimming without any manual configuration.

For custom `IUnifiedResultFactory` implementations with custom types, register a JSON serializer context:

```csharp
[JsonSerializable(typeof(MyResult))]
internal partial class AppJsonContext : JsonSerializerContext { }

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default);
});
```

## ProblemDetails (RFC 7807)

Sharkable supports RFC 7807 ProblemDetails as an alternative error response format. Enable with one flag:

```csharp
builder.Services.AddShark(opt =>
{
    opt.UseProblemDetails = true;
});
```

**Standard format** (all error responses):

```json
{
  "type": "https://httpstatuses.com/429",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Rate limit exceeded. Please retry later.",
  "instance": "/api/orders",
  "traceId": "4bf92f3577b34ad00000000000000000"
}
```

When disabled (default), error responses use the Sharkable unified result envelope instead. `UseProblemDetails` affects all framework-generated errors: 400, 401, 403, 404, 409, 422, 429, 500, 503.
```
