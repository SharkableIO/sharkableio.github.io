# Error Localization

Sharkable supports pluggable error message translation via the `Accept-Language` request header.

## Registration

```csharp
builder.Services.AddShark(opt =>
{
    // Register a custom localizer implementation
    opt.ErrorLocalizerFactory = sp => new MyErrorLocalizer();

    // Default culture when Accept-Language header is missing. Default: "en".
    opt.DefaultCulture = "zh-CN";
});
```

## Implementing IErrorLocalizer

`IErrorLocalizer` is a single-method interface. You can back it with any data source — resx, JSON, XML, YAML, database, or remote API.

### Option 1: .resx files (standard .NET approach)

Create `.resx` files per culture under `Resources/`:

```
Resources/
├── Messages.resx              (default / invariant)
├── Messages.zh-CN.resx
└── Messages.ja.resx
```

```xml
<!-- Resources/Messages.zh-CN.resx -->
<root>
  <data name="Welcome" xml:space="preserve">
    <value>欢迎</value>
  </data>
  <data name="User_NotFound" xml:space="preserve">
    <value>用户未找到</value>
  </data>
</root>
```

```csharp
public class ResxLocalizer : IErrorLocalizer
{
    private readonly Assembly _assembly;
    private readonly string _baseName = "MyApp.Resources.Messages";

    public ResxLocalizer(Assembly assembly) => _assembly = assembly;

    public string Localize(string key, string culture)
    {
        var rm = new ResourceManager(_baseName, _assembly);
        var value = rm.GetString(key, CultureInfo.GetCultureInfo(culture));
        return value ?? key;
    }
}
```

### Option 2: JSON file

```json
{
  "Welcome": {
    "en": "Welcome",
    "zh-CN": "欢迎",
    "ja": "ようこそ"
  },
  "User_NotFound": {
    "en": "User not found",
    "zh-CN": "用户未找到",
    "ja": "ユーザーが見つかりません"
  }
}
```

```csharp
public class JsonLocalizer : IErrorLocalizer
{
    private readonly Dictionary<string, Dictionary<string, string>> _messages;

    public JsonLocalizer(string jsonPath)
    {
        var json = File.ReadAllText(jsonPath);
        _messages = JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, string>>>(json)
            ?? [];
    }

    public string Localize(string key, string culture)
    {
        if (_messages.TryGetValue(key, out var cultures) &&
            cultures.TryGetValue(culture, out var message))
            return message;
        return key;
    }
}
```

```csharp
builder.Services.AddShark(opt =>
{
    opt.ErrorLocalizerFactory = _ => new JsonLocalizer("Resources/messages.json");
    opt.DefaultCulture = "en";
});
```

> XML and YAML work the same way — parse the file and look up `[key][culture]`. For database or remote API, inject the client via constructor.

## Using in Your Endpoints

Inject `HttpContext` and call the `.Localize()` extension method:

```csharp
app.MapGet("/hello", (HttpContext ctx) =>
{
    var msg = ctx.Localize("Welcome");
    return Results.Ok(new { message = msg });
});
```

Client sends `Accept-Language: zh-CN` → `{ "message": "欢迎" }`.

The `.Localize()` extension resolves the culture from the `Accept-Language` header automatically. No manual header parsing needed.

To inspect the resolved culture directly, use `ctx.GetCulture()`:

```csharp
app.MapGet("/info", (HttpContext ctx) =>
{
    var culture = ctx.GetCulture(); // e.g. "zh-CN", "en", "ja"
    var greeting = ctx.Localize("Welcome");
    return Results.Ok(new { culture, greeting });
});
```

### Format Arguments

For messages with placeholders, use `{0}`, `{1}` in your translation and pass arguments:

```json
{
  "WelcomeUser": {
    "en": "Welcome, {0}!",
    "zh-CN": "欢迎你，{0}！"
  },
  "OrderCreated": {
    "en": "Order #{0} created, total: ${1:F2}",
    "zh-CN": "订单 #{0} 已创建，金额：${1:F2}"
  }
}
```

```csharp
app.MapGet("/hello/{name}", (HttpContext ctx, string name) =>
{
    var msg = ctx.Localize("WelcomeUser", name);
    return Results.Ok(new { message = msg });
});
```

Client: `GET /hello/Alice` with `Accept-Language: zh-CN` → `{ "message": "欢迎你，Alice！" }`.

If no arguments are passed, the plain localized string is returned — no formatting overhead.

## Middleware Integration

The framework middlewares that support localization:
- **Rate limiting** (429) — key: `"RateLimitExceeded"`
- **Graceful shutdown** (503) — key: `"ServerShuttingDown"`

Custom error responses from your own middleware can use the same pattern:

```csharp
app.Use(async (ctx, next) =>
{
    if (someCondition)
    {
        ctx.Response.StatusCode = 400;
        await ctx.Response.WriteAsync(ctx.Localize("CustomError"));
        return;
    }
    await next();
});
```
