---
title: Scalar 配置
---

# Scalar 配置

Sharkable 默认在 `/scalar/v1` 提供 Scalar API 参考 UI。你可以通过 `ConfigureScalar()` 自定义其外观和行为。

## 默认设置

```csharp
app.UseShark();
// Scalar UI 位于 /scalar/v1
```

## 自定义 Scalar

使用 `ConfigureScalar()` 传入修改 `ScalarOptions` 的回调：

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureScalar(scalar =>
    {
        scalar
            .WithTitle("My API")
            .WithTheme(ScalarTheme.Purple)
            .WithDarkMode(true);
    });
});
```

## 自动认证配置

当你通过 `ConfigureJwt()` 配置了 JWT Bearer 认证后，Sharkable 会自动在 Scalar UI 中预填 Bearer Token 字段，方便立即测试接口：

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureJwt("https://your-issuer", ["my-api"]);
    // Scalar 会自动配置 Bearer 认证（带占位 Token）
});
```

同样，设置了 `ApiKeys` 时，API Key 认证方案也会自动配置（使用占位值）：

```csharp
builder.Services.AddShark(opt =>
{
    opt.ApiKeys = ["sk-my-secret-key"];
    // Scalar 会自动配置 API Key 认证（使用占位值，不会泄露实际密钥）
});
```

## 常用选项

```csharp
opt.ConfigureScalar(scalar =>
{
    // 主题
    scalar.WithTheme(ScalarTheme.Kepler);

    // 强制深色模式
    scalar.WithDarkModeToggle(false);
    scalar.WithForceThemeMode(ThemeMode.Dark);

    // 隐藏部分 UI
    scalar.HideModels(true);
    scalar.HideDownloadButton(true);
    scalar.HideSearch(true);

    // 默认 HTTP 客户端
    scalar.WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);

    // 服务器地址
    scalar.WithBaseServerUrl("https://api.example.com");

    // 自定义 CSS
    scalar.WithCustomCss(".sidebar { background: #f0f0f0; }");
});
```

完整选项列表请参考 [Scalar.AspNetCore 文档](https://github.com/scalar/scalar)。
