---
title: 请求验证
---

# 请求验证

Sharkable 集成了 FluentValidation，为 `ISharkEndpoint` 端点提供自动请求验证。启用后，传入的参数会与已注册的 `IValidator<T>` 进行匹配验证，无效请求会返回包含 `UnifiedResult` 错误信息的 400 响应。

## 启用

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableValidation = true;
});
```

## 创建验证器

继承 `AbstractValidator<T>` 定义验证规则：

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

## 注册验证器

### 非 AOT 模式（自动扫描）

启用 `EnableValidation = true` 后，Sharkable 会自动扫描已注册程序集中所有 `IValidator<T>` 的实现并注册。

### AOT 模式（手动注册）

AOT 模式下无法使用程序集扫描，需要手动注册：

```csharp
builder.Services.AddSingleton<IValidator<CreateUserRequest>, CreateUserValidator>();
```

## 工作原理

启用并注册后，所有 `ISharkEndpoint` 的参数如果存在对应的 `IValidator<T>` 注册在 DI 中，都会在处理前自动验证。

```csharp
public class UserEndpoint : ISharkEndpoint
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapPost("create", (CreateUserRequest request) =>
        {
            // 如果请求无效，验证过滤器会在到达此处前返回 400 错误
            return Results.Ok("valid!");
        });
    }
}
```

### 成功响应

```json
{
  "statusCode": 200,
  "data": "valid!",
  "errorMessage": null
}
```

### 验证错误响应

```json
{
  "statusCode": 400,
  "data": null,
  "errorMessage": "'Name' must not be empty.; 'Email' must not be empty."
}
```

## 错误格式

`ValidationErrorMode` 枚举控制 400 响应中验证错误的格式：

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableValidation = true;
    opt.ValidationErrorMode = ValidationErrorMode.ProblemDetails;
});
```

| 模式 | 说明 |
|------|------|
| `Messages`（默认） | 将 FluentValidation 的所有错误消息以 `"; "` 拼接放入 `errorMessage` 字段 |
| `ProblemDetails` | RFC 7807 格式的 `ValidationProblemDetails`，包含按属性名索引的 `errors` 对象 |

**Messages 示例：**

```json
{
  "statusCode": 400,
  "data": null,
  "errorMessage": "名称不能为空; 邮箱不能为空。"
}
```

**ProblemDetails 示例：**

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "一个或多个验证错误发生。",
  "status": 400,
  "errors": {
    "Name": ["名称不能为空。"],
    "Email": ["邮箱不能为空。"]
  }
}
```

## AOT 完整示例

```csharp
using System.Text.Json.Serialization;
using FluentValidation;
using Sharkable;

var builder = WebApplication.CreateSlimBuilder(args);

builder.Services.AddShark([typeof(Program).Assembly], opt =>
{
    opt.EnableValidation = true;
});

// AOT 下需要手动注册验证器
builder.Services.AddSingleton<IValidator<CreateUserRequest>, CreateUserValidator>();

// 注册 JsonSerializerContext 以支持 AOT 序列化
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
