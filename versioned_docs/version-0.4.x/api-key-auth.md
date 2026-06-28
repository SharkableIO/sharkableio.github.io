# API Key Authentication

Sharkable provides built-in API key authentication. Requests must include a valid `X-Api-Key` header.

## Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.ApiKeys = ["your-secret-key-here"];
});
```

All endpoints are now protected. Requests without a valid key receive a 401 `Unauthorized`.

## Multiple Keys

```csharp
opt.ApiKeys = ["key-alpha", "key-beta", "key-gamma"];
```

## Unified Error Response

Auth failures return the framework's standard unified result envelope:

```json
{
  "statusCode": 401,
  "data": null,
  "errorMessage": "Unauthorized",
  "extra": null,
  "timeStamp": 1750934400000
}
```

## Integration with JWT

API key and JWT authentication can coexist. When both are configured, either is accepted as valid authentication:

```csharp
builder.Services.AddShark(opt =>
{
    opt.ApiKeys = ["api-key-here"];
    opt.ConfigureJwt("https://your-issuer.com", ["your-api"]);
});
```
