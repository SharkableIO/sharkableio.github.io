# 项目模板

Sharkable 提供 `dotnet new` 项目模板，几秒钟即可搭好一个可运行的服务——预置 OpenAPI、Scalar UI、健康检查、幂等与自动包装。

## 安装

```bash
dotnet new install Sharkable.Templates
```

## 创建项目

```bash
dotnet new sharkable-webapi -o MyService
cd MyService
dotnet run
```

生成的应用在默认 Kestrel 端口启动，包含：

| URL | 用途 |
|---|---|
| `/api/hello` | 示例端点（`UnifiedResult` 自动包装） |
| `/healthz` | 就绪探针 |
| `/livez` | 存活探针 |
| `/openapi/v1.json` | OpenAPI 文档 |
| `/scalar/v1` | Scalar UI（交互式 API 浏览器） |

## 目录结构

```
MyService/
├── Program.cs                  # AddShark + UseShark + 源生成 JSON 上下文
├── Endpoints/HelloEndpoint.cs  # 示例 ISharkEndpoint
├── SharkableWebApi.csproj      # net10.0 + Sharkable 包
├── rd.xml                      # Native AOT 类型保留
└── appsettings.json
```

模板已启用：

- `EnableAutoWrap` — 普通返回值包装为 `UnifiedResult<T>`
- `EnableHealthChecks` — `/healthz` + `/livez`
- `EnableIdempotency` — `Idempotency-Key` 支持
- 源生成 JSON（`AppJsonContext`）— 为 Native AOT 就绪

## Native AOT

模板开箱即支持 Native AOT：

```bash
dotnet publish -c Release -r osx-arm64 -p:PublishAot=true
```

`rd.xml` 保留应用程序集的所有类型，使 `ISharkEndpoint` 发现与特性式 DI 注册在裁剪后依然可用。随着 API 增长，把你的请求/响应类型加入 `AppJsonContext` 即可。

## 卸载

```bash
dotnet new uninstall Sharkable.Templates
```
