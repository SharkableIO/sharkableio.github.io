# Scalar Configuration

Sharkable automatically serves the Scalar API reference UI at `/scalar/v1`. You can customize its appearance and behavior via `ConfigureScalar()`.

## Default setup

```csharp
app.UseShark();
// Scalar UI at /scalar/v1
```

## Customizing Scalar

Use `ConfigureScalar()` to pass a callback that mutates `ScalarOptions`:

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

## Auto-detected authentication

When you configure JWT Bearer authentication via `ConfigureJwt()`, Sharkable automatically pre-fills the Bearer token field in the Scalar UI so you can test endpoints immediately:

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureJwt("https://your-issuer", ["my-api"]);
    // Scalar will auto-configure Bearer auth with a placeholder token
});
```

Similarly, when `ApiKeys` are set, the API Key auth scheme is auto-configured with a placeholder:

```csharp
builder.Services.AddShark(opt =>
{
    opt.ApiKeys = ["sk-my-secret-key"];
    // Scalar will auto-configure API Key auth with a placeholder value
    // (actual keys are never leaked to the client)
});
```

## Common options

```csharp
opt.ConfigureScalar(scalar =>
{
    // Theme
    scalar.WithTheme(ScalarTheme.Kepler);

    // Force dark mode
    scalar.WithDarkModeToggle(false);
    scalar.WithForceThemeMode(ThemeMode.Dark);

    // Hide sections
    scalar.HideModels(true);
    scalar.HideDownloadButton(true);
    scalar.HideSearch(true);

    // Default HTTP client
    scalar.WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);

    // Server URL
    scalar.WithBaseServerUrl("https://api.example.com");

    // Custom CSS
    scalar.WithCustomCss(".sidebar { background: #f0f0f0; }");
});
```

For the full list of options, see the [Scalar.AspNetCore documentation](https://github.com/scalar/scalar).
