# Sharkable

**支持 AOT 的 .NET Minimal API 框架**

[![NuGet Version](https://img.shields.io/nuget/v/Sharkable.svg?color=red&style=flat-square)](https://www.nuget.org/packages/Sharkable/)
[![NuGet Downloads](https://img.shields.io/nuget/dt/Sharkable.svg?style=flat-square)](https://www.nuget.org/packages/Sharkable/)

Sharkable 是一个轻量级、支持 AOT 的 .NET 框架，扩展了 ASP.NET Core Minimal API，提供基于约定的路由、内置中间件和无反射的端点发现。

### 特性

- **基于约定的路由** — `ISharkEndpoint` → 自动映射到 `/api/{group}/{route}`
- **AOT 就绪** — 支持 `PublishAot=true`，运行时无需反射发现端点
- **丰富的中间件** — 审计日志、幂等键、多租户、请求验证、限流、输出缓存
- **OpenAPI 集成** — 类级元数据特性、API 版本控制、Scalar UI
- **统一错误处理** — `UnifiedResult<T>` + 全局异常处理器
- **结构化日志** — 敏感字段脱敏格式化器
- **AutoCrud** — 可选 SqlSugar 驱动的 CRUD（通过 rd.xml 支持 AOT）

### 快速链接

- [快速开始](zh-cn/quickstart.md) — 5 分钟上手
- [GitHub](https://github.com/sharkableio/sharkable) — 源码与 issues

### 关于作者

作者 [**CharleyPeng**](https://github.com/charleypeng) —— .NET 后端开发者，关注简洁架构、AOT 兼容性和开发者体验。
