---
title: 错误本地化
---

# 错误本地化

Sharkable 支持通过 `Accept-Language` 请求头实现可插拔的错误消息翻译。

## 注册

```csharp
builder.Services.AddShark(opt =>
{
    // 注册自定义本地化实现
    opt.ErrorLocalizerFactory = sp => new MyErrorLocalizer();

    // 缺少 Accept-Language 头时的默认语言。默认："en"。
    opt.DefaultCulture = "zh-CN";
});
```

## 实现 IErrorLocalizer

`IErrorLocalizer` 是单方法接口。你可以用任何数据源实现——resx、JSON、XML、YAML、数据库或远程 API。

### 方式一：.resx 文件（标准 .NET 做法）

按语言创建 `.resx` 文件：

```
Resources/
├── Messages.resx              (默认 / 不变量)
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

### 方式二：JSON 文件

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

> XML 和 YAML 同理——解析文件后查 `[key][culture]`。数据库或远程 API 则通过构造函数注入客户端。

## 在端点中使用

注入 `HttpContext` 并调用 `.Localize()` 扩展方法：

```csharp
app.MapGet("/hello", (HttpContext ctx) =>
{
    var msg = ctx.Localize("Welcome");
    return Results.Ok(new { message = msg });
});
```

客户端发送 `Accept-Language: zh-CN` → `{ "message": "欢迎" }`。

`.Localize()` 扩展方法会自动从 `Accept-Language` 头解析语言，不需要手动解析。

### 格式化参数

如果翻译文本包含 `{0}`、`{1}` 占位符，直接传参即可：

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

客户端 `GET /hello/Alice` 带 `Accept-Language: zh-CN` → `{ "message": "欢迎你，Alice！" }`。

不传参时返回纯文本，无格式化开销。

## 中间件集成

已支持本地化的框架中间件：
- **限流**（429）— key：`"RateLimitExceeded"`
- **优雅关闭**（503）— key：`"ServerShuttingDown"`

自定义中间件中也可以使用相同的模式：

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
