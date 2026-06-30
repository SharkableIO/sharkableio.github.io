# ETag / 304 Not Modified

Sharkable provides opt-in ETag support for GET/HEAD responses:

```csharp
opt.EnableETag = true;
```

## ETag Configuration

```csharp
opt.ETagOptions = new ETagOptions
{
    // HTTP methods eligible for ETag caching. Default: GET, HEAD.
    CacheableMethods = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "GET", "HEAD" },

    // Cache-Control header on ETagged responses. Default: "public, max-age=0, must-revalidate".
    CacheControlHeader = "public, max-age=3600",

    // Predicate to skip caching for certain status codes. Default skips < 200 and >= 300.
    ShouldSkipStatus = status => status is < 200 or >= 300,

    // Paths excluded from ETag processing (prefix match).
    ExcludePaths = ["/healthz", "/openapi", "/scalar", "/_sharkable"],
};
```
