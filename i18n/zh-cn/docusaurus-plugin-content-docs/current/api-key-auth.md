---
title: API 密钥认证
---

# API 密钥认证

Sharkable 提供内置的 API 密钥认证。请求必须包含有效的 `X-Api-Key` 头。

## 快速开始

```csharp
builder.Services.AddShark(opt =>
{
    opt.ApiKeys = ["your-secret-key-here"];
});
```

所有端点现已受保护。缺少有效密钥的请求返回 401 `Unauthorized`。

## 多密钥

```csharp
opt.ApiKeys = ["key-alpha", "key-beta", "key-gamma"];
```

## 统一错误响应

认证失败返回框架标准的统一结果封装：

```json
{
  "statusCode": 401,
  "data": null,
  "errorMessage": "Unauthorized",
  "extra": null,
  "timeStamp": 1750934400000
}
```

## 与 JWT 共存

API 密钥和 JWT 认证可以共存。两者都配置时，任一凭证类型均可通过认证：

```csharp
builder.Services.AddShark(opt =>
{
    opt.ApiKeys = ["api-key-here"];
    opt.ConfigureJwt("https://your-issuer.com", ["your-api"]);
});
```
