---
title: 分布式追踪
---

# 分布式追踪

Sharkable 提供内置的 W3C `traceparent` 兼容的分布式追踪，零外部依赖。OpenTelemetry 导出器（Jaeger、Zipkin、OTLP）可在安装后自动接入。

## 快速开始

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureTracing(t =>
    {
        t.ServiceName = "order-api";
    });
});

var app = builder.Build();
app.UseShark();
```

每个请求现在创建一个 `traceparent` 兼容的 span，所有响应附加 `X-Trace-Id` 头。

## 工作原理

1. **请求到达** → 中间件创建 `Activity`（W3C span）
2. **traceparent 传播** → 继承请求中的 `traceparent` 头；若无则生成新的根 trace
3. **标记** → HTTP 方法、路径、主机、客户端 IP、状态码、耗时
4. **异常记录** → 未处理异常设置 `ActivityStatusCode.Error` + 异常标签
5. **响应** → 附加 `X-Trace-Id` 头

## 零依赖

追踪中间件仅使用 `System.Diagnostics.ActivitySource` 和 `System.Diagnostics.Activity` —— .NET 运行时内置，无需额外 NuGet 包。

## OpenTelemetry 集成

安装 OpenTelemetry SDK（独立 NuGet 包）并配置监听 Sharkable 的 `ActivitySource`：

```bash
dotnet add package OpenTelemetry.Extensions.Hosting
dotnet add package OpenTelemetry.Exporter.Console  # 或 Jaeger/Zipkin/OTLP
```

```csharp
// Program.cs — AddShark() 之后
builder.Services.AddOpenTelemetry()
    .WithTracing(t => t
        .AddSource("Sharkable")          // Sharkable 的 ActivitySource 名称
        .AddConsoleExporter()            // 或 AddJaegerExporter(...)
    );
```

`ActivitySource` 名称以常量形式暴露：
```csharp
TracingMiddleware.ActivitySourceName   // "Sharkable"
```

## 可插拔导出器接口

如需自定义导出器或 NuGet 插件，实现 `ITracingExporter`：

```csharp
public interface ITracingExporter
{
    void OnActivityStarted(Activity activity);
    void OnActivityStopped(Activity activity);
}
```

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureTracing(t =>
    {
        t.Exporter = new MyCustomExporter();
    });
});
```

后续 `Sharkable.OpenTelemetry` NuGet 包将提供预建的 Jaeger/Zipkin/OTLP 导出器。

## 配置

```csharp
opt.ConfigureTracing(t =>
{
    // 追踪中上报的服务名。默认：入口程序集名。
    t.ServiceName = "order-api";

    // 自定义导出器（可选）。默认：无操作（OTel SDK 自动挂钩）。
    t.Exporter = new MyCustomExporter();
});
```
