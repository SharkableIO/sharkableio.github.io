# 统一响应

Sharkable 提供了可插拔的统一响应系统，确保所有 API 端点使用一致的响应格式。

## 概述

统一响应系统分为三层：

1. **`IUnifiedResult`** — 标记接口，定义统一响应的基本结构（`StatusCode`、`Data`、`ErrorMessage`）
2. **`UnifiedResult<T>`** — 框架内置的默认实现
3. **`IUnifiedResultFactory`** — 工厂接口，替换它即可使用自己的响应格式

## 默认用法

```csharp
// 手动创建结果
var result = new UnifiedResult<string>("hello");
// { "statusCode": 200, "data": "hello", "errorMessage": null, ... }

// 带状态码
var error = new UnifiedResult<string>(null, "not found", HttpStatusCode.NotFound);
```

## 扩展方法

```csharp
// 包装为成功响应
return data.AsOkResult();

// 包装为错误请求
return "invalid input".AsBadRequest();

// 包装为未授权
return "token expired".AsUnauthorized();
```

## 自动包装（EnableAutoWrap）

开启后，返回值不是 `IResult` 的端点会被自动包装：

```csharp
app.UseShark(opt =>
{
    opt.EnableAutoWrap = true;
});

app.MapGet("hello", () => "world");
// 响应：{ "statusCode": 200, "data": "world", ... }
```

## 自定义响应格式

实现 `IUnifiedResult` 和 `IUnifiedResultFactory` 来使用自己的响应格式：

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

在 `AddShark()` 中注册工厂：

```csharp
builder.Services.AddShark(opt =>
{
    opt.UnifiedResultFactory = new MyResultFactory();
});
```

此后所有异常处理器和自动包装的响应都会使用 `MyResult` 格式。

## AOT 支持

使用 `[JsonSerializable]` 注册你的结果类型以支持 AOT 编译：

```csharp
[JsonSerializable(typeof(MyResult))]
internal partial class AppJsonContext : JsonSerializerContext { }

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default);
});
```
