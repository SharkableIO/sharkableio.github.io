# Distributed Tracing

Sharkable provides built-in W3C `traceparent`-compliant distributed tracing with zero external dependencies. OpenTelemetry exporters (Jaeger, Zipkin, OTLP) hook in automatically when installed.

## Quick Start

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

Every request now creates a `traceparent`-compliant span. The `X-Trace-Id` header is added to all responses.

## How It Works

1. **Request arrives** → middleware creates an `Activity` (W3C span)
2. **`traceparent` propagation** → incoming `traceparent` header is inherited; if absent, a new root trace is generated
3. **Tagging** → HTTP method, path, host, client IP, status code, duration
4. **Exception recording** → unhandled exceptions set `ActivityStatusCode.Error` + exception tags
5. **Response** → `X-Trace-Id` header appended

## Zero Dependencies

The tracing middleware uses only `System.Diagnostics.ActivitySource` and `System.Diagnostics.Activity` — built into .NET runtime. No NuGet packages required.

## OpenTelemetry Integration

Install the OpenTelemetry SDK (separate NuGet packages) and configure it to listen to Sharkable's `ActivitySource`:

```bash
dotnet add package OpenTelemetry.Extensions.Hosting
dotnet add package OpenTelemetry.Exporter.Console  # or Jaeger/Zipkin/OTLP
```

```csharp
// Program.cs — after AddShark()
builder.Services.AddOpenTelemetry()
    .WithTracing(t => t
        .AddSource("Sharkable")          // Sharkable's ActivitySource name
        .AddConsoleExporter()            // or AddJaegerExporter(...)
    );
```

The `ActivitySource` name is exposed as a constant:
```csharp
TracingMiddleware.ActivitySourceName   // "Sharkable"
```

## Pluggable Exporter Interface

For custom exporters or NuGet plugins, implement `ITracingExporter`:

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

A future `Sharkable.OpenTelemetry` NuGet package will provide pre-built Jaeger/Zipkin/OTLP exporters.

## Configuration

```csharp
opt.ConfigureTracing(t =>
{
    // Service name reported in traces. Default: entry assembly name.
    t.ServiceName = "order-api";

    // Custom exporter (optional). Default: no-op (OTel SDK hooks automatically).
    t.Exporter = new MyCustomExporter();
});
```
