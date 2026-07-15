---
title: 响应压缩
---

# 响应压缩

Sharkable 提供一行式响应压缩，基于 ASP.NET Core 内置中间件。

## 快速开始

```csharp
builder.Services.AddShark(opt =>
{
    opt.EnableResponseCompression = true;
});
```

所有 JSON/文本响应通过 gzip/brotli 压缩（依据客户端 `Accept-Encoding`）。已压缩内容（图片、视频）自动跳过。

## 管道位置

压缩中间件在管道**前端**运行（追踪之后、优雅关闭之前），覆盖最广的响应范围。

## 性能

- JSON 负载大小减少 60-80%
- 端点和服务代码零修改
- 使用 ASP.NET Core 的 `ResponseCompressionMiddleware` — 久经考验，AOT 兼容
