# 安全响应头

Sharkable 提供了可选的中间件，用于添加标准的安全 HTTP 响应头。所有头默认禁用——你选择启用哪些。

## 快速开始

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureSecurityHeaders(h =>
    {
        h.ContentTypeOptions = true;
        h.FrameOptions = "DENY";
        h.ReferrerPolicy = "no-referrer";
        h.StrictTransportSecurity = true;
    });
});

var app = builder.Build();
app.UseShark();
```

## 配置

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `ContentTypeOptions` | `bool` | `false` | 添加 `X-Content-Type-Options: nosniff` |
| `FrameOptions` | `string?` | `null` | `X-Frame-Options` 值（如 `"DENY"`） |
| `ReferrerPolicy` | `string?` | `null` | `Referrer-Policy` 值 |
| `ContentSecurityPolicy` | `string?` | `null` | `Content-Security-Policy` 值 |
| `PermissionsPolicy` | `string?` | `null` | `Permissions-Policy` 值 |
| `StrictTransportSecurity` | `bool` | `false` | 添加 HSTS |
| `HstsMaxAge` | `int` | `31536000` | HSTS max-age（秒） |
| `CrossOriginResourcePolicy` | `string?` | `null` | `Cross-Origin-Resource-Policy` 值 |
| `CrossOriginOpenerPolicy` | `string?` | `null` | `Cross-Origin-Opener-Policy` 值 |
| `CrossOriginEmbedderPolicy` | `string?` | `null` | `Cross-Origin-Embedder-Policy` 值 |
| `ExcludePaths` | `string[]` | `[]` | 跳过的路径前缀 |

## 工作原理

头部通过 `context.Response.OnStarting()` 注册——在首次写入前添加，因此会出现在所有响应（包括错误响应）上。中间件在管道中较早运行（响应压缩之后、优雅关闭之前）。

## AOT

完全 AOT 兼容，无反射。

## 安全

所有用户提供的头部值在启动时通过 `ConfigurationValidator` 验证，阻止 CR/LF/NUL 字符以防止头部注入攻击。
