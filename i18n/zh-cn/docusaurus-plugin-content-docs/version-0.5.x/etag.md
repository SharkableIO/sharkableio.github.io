---
title: ETag / 304
---

# ETag / 304 Not Modified

Sharkable 提供可选的 GET/HEAD 响应的 ETag 支持：

```csharp
opt.EnableETag = true;
```

## ETag 配置

```csharp
opt.ETagOptions = new ETagOptions
{
    // 可被 ETag 缓存的 HTTP 方法。默认：GET、HEAD
    CacheableMethods = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "GET", "HEAD" },

    // ETag 响应中的 Cache-Control 头。默认："public, max-age=0, must-revalidate"
    CacheControlHeader = "public, max-age=3600",

    // 判断哪些状态码应跳过的谓词。默认跳过 < 200 和 >= 300
    ShouldSkipStatus = status => status is < 200 or >= 300,

    // 排除路径（前缀匹配）
    ExcludePaths = ["/healthz", "/openapi", "/scalar", "/_sharkable"],
};
```
