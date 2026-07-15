# Response Compression

Sharkable provides one-line response compression via ASP.NET Core's built-in middleware.

## Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableResponseCompression = true;
});
```

All JSON/text responses are compressed with gzip/brotli (based on client's `Accept-Encoding` header). Already-compressed content (images, videos) is automatically skipped.

## Pipeline Position

Compression middleware runs **early** in the pipeline (after tracing, before graceful shutdown) to cover the widest range of responses.

## Performance

- Reduces JSON payload size by 60-80%
- Zero code changes in endpoints or services
- Uses ASP.NET Core's `ResponseCompressionMiddleware` — battle-tested, AOT-compatible
