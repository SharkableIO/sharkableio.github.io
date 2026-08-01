# 请求超时

对 ASP.NET Core 内置 `AddRequestTimeouts` 的薄封装。Sharkable 自动注册服务并连接中间件。

## 快速开始

```csharp
builder.Services.AddShark(opt =>
{
    opt.RequestTimeoutsConfigure = o =>
    {
        o.AddPolicy("api", TimeSpan.FromSeconds(30));
        o.DefaultPolicy = "api";
    };
    opt.DefaultRequestTimeoutPolicy = "api";
});
```

## 按端点 DSL

```csharp
app.MapGet("/fast", () => "ok")
   .SharkRequestTimeout("api");
```

## AOT

完全 AOT 兼容。
