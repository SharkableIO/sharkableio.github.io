Add the NuGet package (.NET 10+):

```bash
dotnet add package Sharkable --version 0.5.1
```

Or using package reference:

```xml
<PackageReference Include="Sharkable" Version="0.5.1" />
```

Add the using directive:

```csharp
using Sharkable;
```

Add Sharkable services (normal mode):

```csharp
builder.Services.AddShark();
```

Add Sharkable services (AOT mode):

```csharp
// For AOT, specify assemblies explicitly to avoid code trim
builder.Services.AddShark([typeof(Program).Assembly]);
```

Wire up the middleware:

```csharp
var app = builder.Build();
app.UseShark();
```

That's it — endpoints are discovered, DI is wired, OpenAPI/Scalar is ready.
