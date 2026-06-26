# 幂等中间件 / Idempotency

Sharkable 提供一个可选启用的中间件，让客户端可以安全地重试非幂等的 HTTP 请求（`POST` / `PUT` / `PATCH` / `DELETE`），避免重复执行。第一次响应被缓存，后续携带相同 `Idempotency-Key` 头的请求会重放该响应。

## 快速开始

```csharp
builder.Services.AddShark([typeof(Program).Assembly], opt =>
{
    opt.EnableIdempotency = true;
});

var app = builder.Build();
app.UseShark();
```

客户端在不安全请求上发送 `Idempotency-Key` 头：

```
POST /api/payments
Idempotency-Key: 8c0a6f4e-9b2d-4f1a-b3c7-2e5d8a1f0b6c
Content-Type: application/json

{ "amount": 100, "userId": 42 }
```

用相同 key 重试会重放原始响应（响应头 `X-Idempotent-Replayed: true`）。用相同 key 但不同 payload 重试返回 422。并发同 key 请求返回 409 + `Retry-After: 1`。

## 配置

```csharp
opt.ConfigureIdempotency(o =>
{
    // 已完成响应保留时长，默认 24 小时
    o.Ttl = TimeSpan.FromHours(24);

    // in-flight 占位的自动驱逐时间，默认 30 秒
    // 防止进程中途崩溃导致死锁
    o.InFlightTtl = TimeSpan.FromSeconds(30);

    // key 最大长度，默认 255（IETF 草案上限）
    o.MaxKeyLength = 255;

    // 超过此大小的响应会被 500 拒绝且不缓存，默认 1 MiB
    o.MaxResponseSize = 1_048_576;

    // 触发中间件的方法集合
    o.UnsafeMethods = new HashSet<HttpMethod>
    {
        HttpMethod.Post, HttpMethod.Put, HttpMethod.Patch, HttpMethod.Delete
    };

    // 头名称（一般无需修改）
    o.HeaderName = "Idempotency-Key";
    o.ReplayedHeaderName = "X-Idempotent-Replayed";
});
```

## 行为

| 场景 | 结果 |
|---|---|
| 没有 `Idempotency-Key` 头 | 透传，业务照常执行 |
| `GET` / `HEAD` 带 key | 透传，header 被忽略 |
| 第一次带 key 请求 | 执行，缓存响应（24h） |
| 重放：同 key + 同 body | 重放缓存的响应；`X-Idempotent-Replayed: true` |
| 重放：同 key + **不同** body | 422 `idempotency_key_conflict` |
| 并发同 key 请求（首个尚未完成） | 409 `idempotency_in_progress` + `Retry-After: 1` |
| 第一次响应是 5xx | **不**缓存，重试会重新执行 |
| 第一次响应是 429 | **不**缓存，客户端应遵守 `Retry-After` |
| 第一次响应是 2xx / 3xx / 4xx（其他） | 缓存并重放 |
| 响应体 > 1 MiB | 500 `idempotency_response_too_large`；释放 in-flight |
| Key 格式非法（空、> 255 字符、含控制字符） | 400 `invalid_idempotency_key` |

"不同 body" 的判定基于 `method + "\n" + path + "\n" + body` 的 SHA-256 指纹。第一次请求的指纹会随响应一起存储，每次重放都做比对。

## 客户端如何生成 Key

`Idempotency-Key` **始终由客户端在发送请求前生成**，服务器从不颁发。推荐做法：

- 在用户做出业务动作的瞬间（"点击支付"按钮）生成 UUID（v4），**不**是在发起 HTTP 调用时
- 持久化到 UI 状态（React state、按钮状态等），保证重试时复用同一个值
- 同一次业务操作的所有重试都使用同一个 key
- 每次新的业务操作使用不同的 key，即使用户重复同一个动作

```javascript
// React 示例
const handlePay = () => {
    const idempotencyKey = useRef(crypto.randomUUID()).current; // 只生成一次
    fetch('/api/payments', {
        method: 'POST',
        headers: {
            'Idempotency-Key': idempotencyKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
};
```

## 错误响应格式

所有幂等错误都遵循框架标准的 `UnifiedResult<T>` envelope。机器可读的错误 code 以 `[code]` 前缀嵌入 `errorMessage`：

```json
{
  "statusCode": 409,
  "data": null,
  "errorMessage": "[idempotency_in_progress] An identical request is already in progress; retry after 1 second.",
  "extra": null,
  "timeStamp": 1750934400000
}
```

客户端可以按 `statusCode` 路由，并检查 `errorMessage` 里的方括号前缀来区分具体的失败模式。

## AOT 支持

中间件是 AOT 安全的。无反射、无用户类型上的 `Create()` 工厂调用、无 `dynamic`。`Sharkable.AotSample` 在构建期端到端验证该特性。

## 已知限制

- **仅支持单实例。** 内存存储是进程级别的。多实例部署需要自行实现分布式的 `IIdempotencyStore`（如 Redis）—— v1 不提供。
- **不支持流式响应。** 超过 1 MiB 的响应会被 500 拒绝且不缓存。
- **请求体指纹。** 请求体的指纹计算要求中间件运行时请求体可读。如果端点已经消费过请求体（例如没有上游 `EnableBuffering` 的 `[FromBody]` 模型绑定），指纹会基于空字节计算，422 检查会失效。
