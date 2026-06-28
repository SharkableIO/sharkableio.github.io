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

```csharp
// Wrap data as success response
return data.AsOkResult();

// Wrap error as bad request
return "invalid input".AsBadRequest();

// Wrap error as unauthorized
return "token expired".AsUnauthorized();
```

## Auto-wrap with EnableAutoWrap

When `EnableAutoWrap` is enabled, endpoint return values that are not `IResult` are automatically wrapped:

```csharp
app.UseShark(opt =>
{
    opt.EnableAutoWrap = true;
});

app.MapGet("hello", () => "world");
// Response: { "statusCode": 200, "data": "world", ... }
```

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

> **Important:** When using a custom response format with `EnableAutoWrap`, the OpenAPI document transformer still generates the default `UnifiedResult<T>` schema shape. To make the generated OpenAPI document match your actual response structure, set `WrapSchemaFactory`:

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

Register your result type with `[JsonSerializable]` for AOT compilation:

```csharp
[JsonSerializable(typeof(MyResult))]
internal partial class AppJsonContext : JsonSerializerContext { }

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default);
});
```
