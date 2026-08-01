# Redacting Formatter

Sharkable provides a structured log field redaction feature that automatically masks sensitive values in `ILogger` output. Instead of wrapping or replacing providers, it swaps the default `ILogger<T>` with a redacting wrapper at the DI level — no double output, no recursion.

## Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureRedactingLog(cfg =>
    {
        cfg.RedactFields = ["password", "secret", "token"];
    });
});

var app = builder.Build();
app.UseShark();
```

Every structured log call is now scanned for fields matching the configured names:

```csharp
public class PaymentService(ILogger<PaymentService> logger)
{
    public void ProcessPayment(string email, string password, decimal amount)
    {
        logger.LogInformation(
            "Processing payment for {Email} with password {Password}",
            email, password);
        // Output: "Processing payment for user@test.com with password ***"
    }
}
```

## Configuration

```csharp
opt.ConfigureRedactingLog(cfg =>
{
    // Field names to redact (case-insensitive).
    // Defaults: ["password", "secret", "token", "apiKey",
    //            "authorization", "creditCard", "ssn"]
    cfg.RedactFields = ["password", "secret", "token", "apiKey"];

    // Replacement text. Default "***".
    cfg.RedactWith = "****";
});
```

## How It Works

1. `ConfigureRedactingLog()` stores `RedactingLogOptions` globally
2. During `AddCommon()`, it replaces the open generic `ILogger<T>` registration with `RedactingLogger<T>`
3. `RedactingLogger<T>` creates an inner `ILogger` via `ILoggerFactory` and wraps it with a `RedactingLogger`
4. When `Log<TState>()` is called, the wrapper detects structured state via `IReadOnlyList<KeyValuePair<string, object?>>`
5. Values whose key names match the redact list are replaced in the formatted output
6. Replacements are sorted longest-first to avoid partial-value collisions

The original `ILoggerProvider` chain (console, file, etc.) is untouched — this is a wrapper around the `ILogger<T>` that each class receives.

## Standalone Registration

You can also register via `ILoggingBuilder` directly, outside of `AddShark()`:

```csharp
builder.Logging.AddRedactingFormatter(cfg =>
{
    cfg.RedactFields = ["creditCard", "ssn"];
});
```

## AOT Support

The implementation is fully AOT-safe. No reflection, no `dynamic`. The wrapper uses generic typing (`ILogger<T>` → `RedactingLogger<T>`) and interface checks (`is IReadOnlyList<KeyValuePair<,>>`), all of which the native AOT compiler handles correctly.

## What Gets Redacted

Only structured log parameters — the named placeholders in message templates like `{Password}` — are checked against the redact list. Non-structured string messages pass through unmodified.

The redact list is matched by **key name**, not by value content. A field named `{Password}` is redacted regardless of its value (a short string like `"x"` or a long token). This avoids false positives from value-based scanning.
