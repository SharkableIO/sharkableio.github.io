# Project Templates

Sharkable ships a `dotnet new` project template so you can scaffold a working service in seconds — with OpenAPI, Scalar UI, health checks, idempotency and auto-wrap pre-configured.

## Install

```bash
dotnet new install Sharkable.Templates
```

## Create a project

```bash
dotnet new sharkable-webapi -o MyService
cd MyService
dotnet run
```

That's it. The generated app listens on the default Kestrel port with:

| URL | Purpose |
|---|---|
| `/api/hello` | Example endpoint (auto-wrapped `UnifiedResult` envelope) |
| `/healthz` | Readiness probe |
| `/livez` | Liveness probe |
| `/openapi/v1.json` | OpenAPI document |
| `/scalar/v1` | Scalar UI (interactive API explorer) |

## What's inside

```
MyService/
├── Program.cs                  # AddShark + UseShark + source-gen JSON context
├── Endpoints/HelloEndpoint.cs  # Example ISharkEndpoint
├── SharkableWebApi.csproj      # net10.0 + Sharkable package
├── rd.xml                      # Native AOT type retention
└── appsettings.json
```

The template enables:

- `EnableAutoWrap` — plain returns wrapped in `UnifiedResult<T>`
- `EnableHealthChecks` — `/healthz` + `/livez`
- `EnableIdempotency` — `Idempotency-Key` support
- Source-generated JSON (`AppJsonContext`) — ready for Native AOT

## Native AOT

The template is Native AOT-ready out of the box:

```bash
dotnet publish -c Release -r osx-arm64 -p:PublishAot=true
```

`rd.xml` retains the app assembly's types so `ISharkEndpoint` discovery and attribute-based DI registration survive trimming. Add your request/response types to `AppJsonContext` as you grow the API.

## Uninstall

```bash
dotnet new uninstall Sharkable.Templates
```
