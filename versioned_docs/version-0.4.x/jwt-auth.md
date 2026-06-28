# JWT Bearer Authentication

Sharkable provides opinionated JWT Bearer authentication with minimal configuration.

## Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureJwt(
        authority: "https://your-issuer.com",
        audiences: ["your-api"],
        configure: jwt =>
        {
            // optional additional JwtBearerOptions configuration
        }
    );
});
```

## Unified Error Response

Authentication (401) and authorization (403) failures return the framework's standard unified result envelope:

```json
{
  "statusCode": 401,
  "data": null,
  "errorMessage": "Authentication failed",
  "extra": null,
  "timeStamp": 1750934400000
}
```

## Configuration Validation

At startup, Sharkable validates that both `authority` and `audiences` are properly configured. If either is missing or invalid, a `SharkConfigurationException` is thrown before the application starts. See [Configuration Validation](config-validation) for details.

## Integration with API Key

JWT and [API Key](api-key-auth) authentication can coexist. When both are configured, either credential type is accepted.
