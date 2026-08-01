# 服务端推送事件（SSE）

Sharkable 提供 AOT 安全的 Server-Sent Events（SSE）流式 API——一等公民的 `IResult` 加端点 DSL，并与管线其他能力（幂等、ETag、缓存）正确配合。

## 为什么用 SSE

SSE 是基于普通 HTTP 的单向（服务器→客户端）推送通道：

| | SSE | WebSocket |
|---|---|---|
| 方向 | 仅服务器 → 客户端 | 双向 |
| 协议 | 普通 HTTP（`text/event-stream`） | HTTP 升级 |
| 重连 | 自动（事件 `id` + `retry`） | 手动 |
| 代理/防火墙 | 随处可用 | 常被拦截 |
| 客户端 | `fetch` + `EventSource` | 专用客户端库 |

适用场景：实时通知、进度推送、日志流、LLM token 流式输出、仪表盘实时更新。

## 快速开始

```csharp
app.MapGet("events", (CancellationToken ct) =>
    Results.Extensions.Sse(async (SseEventWriter writer, CancellationToken ct) =>
    {
        for (var i = 0; i < 10; i++)
        {
            await writer.WriteEventAsync($"tick {i}", eventType: "tick", id: i.ToString());
            await Task.Delay(1000, ct);
        }
    }))
    .SharkSse();   // DSL：跳过幂等缓冲 + 在 OpenAPI 中声明 text/event-stream
```

- `Results.Extensions.Sse(handler)` 返回流式 `IResult`。
- `.SharkSse()` 将端点标记为流：跳过幂等缓冲（流无法重放），并在生成的 OpenAPI 文档中声明 `text/event-stream` 响应。
- 管线的 ETag 与响应缓存中间件已按 content type 跳过 `text/event-stream` 响应，事件可无缓冲直达客户端。

## SseEventWriter API

| 方法 | 用途 |
|---|---|
| `WriteEventAsync(data, eventType?, id?, retryMs?)` | 发送一个事件（多行负载按 SSE 规范拆分） |
| `WriteCommentAsync(comment)` | 发送 `: comment` 心跳行 |
| `FlushAsync()` | 立即冲刷缓冲字节 |

`retryMs: 0` 会被如实发送（规范语义："不要重连"）。全程遵循 `CancellationToken`；客户端断开时 handler 内抛出 `OperationCanceledException`。

## 与幂等的交互

SSE 端点绝不能重放——流是即产即消的。`.SharkSse()` 附加 `NoIdempotencyMetadata`，带 `Idempotency-Key` 头的请求直接流式返回，不做缓冲与重放。未加 `.SharkSse()` 的端点保持标准缓冲行为。

## OpenAPI

`.SharkSse()` 在生成的文档中把响应声明为 `text/event-stream`（schema 为 `string`）：

```json
"200": { "description": "OK", "content": { "text/event-stream": { "schema": { "type": "string" } } } }
```

## Native AOT

SSE 写入器只做纯 UTF-8 字节输出——无反射、无 JSON 序列化——Native AOT 发布零裁剪配置即可工作。
