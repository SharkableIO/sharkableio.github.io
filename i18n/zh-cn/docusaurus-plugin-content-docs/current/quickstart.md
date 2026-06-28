---
title: 快速开始
---

从 NuGet 添加包（需要 .NET 10+）：

```bash
dotnet add package Sharkable --version 0.3.2
```

或使用包引用：

```xml
<PackageReference Include="Sharkable" Version="0.3.2" />
```

在项目中添加引用：

```csharp
using Sharkable;
```

添加 Sharkable 服务（正常模式）：

```csharp
builder.Services.AddShark();
```

添加 Sharkable 服务（AOT 模式）：

```csharp
// AOT 用户请自行指定程序集并避免代码修剪
builder.Services.AddShark([typeof(Program).Assembly]);
```

添加中间件：

```csharp
var app = builder.Build();
app.UseShark();
```

好了，端点已自动发现、依赖注入已配置、OpenAPI/Scalar 已就绪。
