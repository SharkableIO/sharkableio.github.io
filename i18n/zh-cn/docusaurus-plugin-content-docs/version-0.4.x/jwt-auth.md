---
title: JWT Bearer 认证
---

# JWT Bearer 认证

Sharkable 提供预配置的 JWT Bearer 认证，只需最少配置。

## 快速开始

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureJwt(
        authority: "https://your-issuer.com",
        audiences: ["your-api"],
        configure: jwt =>
        {
            // 可选的额外 JwtBearerOptions 配置
        }
    );
});
```

## 统一错误响应

认证失败（401）和授权失败（403）返回框架标准的统一结果封装：

```json
{
  "statusCode": 401,
  "data": null,
  "errorMessage": "Authentication failed",
  "extra": null,
  "timeStamp": 1750934400000
}
```

## 配置校验

启动时 Sharkable 会验证 `authority` 和 `audiences` 是否配置正确。任一缺失或无效时，应用启动前抛出 `SharkConfigurationException`。详见 [配置校验](config-validation)。

## 与 API 密钥共存

JWT 和 [API 密钥](api-key-auth) 认证可以共存。两者都配置时，任一凭证类型均可通过认证。
