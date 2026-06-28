# Sharkable

**AOT-compatible Minimal API framework for .NET**

[![NuGet Version](https://img.shields.io/nuget/v/Sharkable.svg?color=red&style=flat-square)](https://www.nuget.org/packages/Sharkable/)
[![NuGet Downloads](https://img.shields.io/nuget/dt/Sharkable.svg?style=flat-square)](https://www.nuget.org/packages/Sharkable/)

Sharkable is a lightweight, AOT-friendly framework that extends ASP.NET Core Minimal APIs with convention-based routing, built-in middleware, and zero-reflection endpoint discovery.

### Features

- **Convention-based routing** — `ISharkEndpoint` → auto-routed at `/api/{group}/{route}`
- **AOT-ready** — works with `PublishAot=true`, no runtime reflection for endpoint discovery
- **Rich middleware** — audit trail, idempotency, multi-tenant, request validation, rate limiting, output caching
- **OpenAPI integration** — class-level metadata attributes, API versioning, Scalar UI
- **Unified error handling** — `UnifiedResult<T>` + global exception handler
- **Structured logging** — redacting formatter for sensitive data
- **AutoCrud** — optional SqlSugar-based CRUD (AOT via rd.xml)

### Quick links

- [QuickStart](quickstart.md) — get started in 5 minutes
- [GitHub](https://github.com/sharkableio/sharkable) — source code & issues

### About the author

Created by [**CharleyPeng**](https://github.com/charleypeng) — .NET backend developer focused on clean architecture, AOT compatibility, and developer experience.
