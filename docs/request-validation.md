# Request Validation

Sharkable integrates with FluentValidation to provide automatic request validation for `ISharkEndpoint` endpoints. When enabled, incoming parameters are validated against registered `IValidator<T>` implementations, and invalid requests return a 400 response with a `UnifiedResult` error body.

## Enable

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableValidation = true;
});
```

## Create a validator

Define a validator by extending `AbstractValidator<T>`:

```csharp
using FluentValidation;

public class CreateUserRequest
{
    public string Name { get; set; }
    public string Email { get; set; }
}

public class CreateUserValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}
```

## Register the validator

### Non-AOT mode (auto-scan)

When `EnableValidation = true`, Sharkable scans the registered assemblies for `IValidator<T>` implementations and registers them automatically.

### AOT mode (manual registration)

In AOT mode, assembly scanning doesn't work. Register validators explicitly:

```csharp
builder.Services.AddSingleton<IValidator<CreateUserRequest>, CreateUserValidator>();
```

## How it works

Once enabled and registered, any `ISharkEndpoint` parameter that has a corresponding `IValidator<T>` registered in DI is automatically validated before the handler runs.

```csharp
public class UserEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapPost("create", (CreateUserRequest request) =>
        {
            // If request is invalid, the validation filter short-circuits
            // and returns a 400 UnifiedResult error before reaching here.
            return Results.Ok("valid!");
        });
    }
}
```

### Successful response

```json
{
  "statusCode": 200,
  "data": "valid!",
  "errorMessage": null
}
```

### Validation error response

```json
{
  "statusCode": 400,
  "data": null,
  "errorMessage": "'Name' must not be empty.; 'Email' must not be empty."
}
```

## Error Shape

The `ValidationErrorMode` enum controls how validation errors are formatted in the 400 response:

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableValidation = true;
    opt.ValidationErrorMode = ValidationErrorMode.ProblemDetails;
});
```

| Mode | Description |
|------|-------------|
| `Messages` (default) | Joins all FluentValidation error messages with `"; "` into the `errorMessage` field |
| `ProblemDetails` | RFC 7807 `ValidationProblemDetails` with `errors` object keyed by property name |

**Messages example:**

```json
{
  "statusCode": 400,
  "data": null,
  "errorMessage": "'Name' must not be empty.; 'Email' must not be empty."
}
```

**ProblemDetails example:**

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "Name": ["'Name' must not be empty."],
    "Email": ["'Email' must not be empty."]
  }
}
```

## AOT example (full)

```csharp
using System.Text.Json.Serialization;
using FluentValidation;
using Sharkable;

var builder = WebApplication.CreateSlimBuilder(args);

builder.Services.AddShark([typeof(Program).Assembly], opt =>
{
    opt.EnableValidation = true;
});

// Manually register validators for AOT
builder.Services.AddSingleton<IValidator<CreateUserRequest>, CreateUserValidator>();

// Register JsonSerializerContext for AOT serialization
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default);
});

var app = builder.Build();
app.UseShark();
app.Run();

public record CreateUserRequest(string Name, string Email);

public class CreateUserValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}

[JsonSerializable(typeof(CreateUserRequest))]
internal partial class AppJsonContext : JsonSerializerContext { }
```
