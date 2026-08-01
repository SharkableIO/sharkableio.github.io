# Server-Sent Events (SSE)

Sharkable provides an AOT-safe Server-Sent Events (SSE) streaming API — a first-class `IResult` plus an endpoint DSL that plays well with the rest of the pipeline (idempotency, ETag, caching).

## Why SSE

SSE is a one-way server→client push channel over plain HTTP:

| | SSE | WebSocket |
|---|---|---|
| Direction | Server → client only | Bidirectional |
| Protocol | Plain HTTP (`text/event-stream`) | HTTP upgrade |
| Reconnection | Automatic (event `id` + `retry`) | Manual |
| Proxies / firewalls | Works everywhere | Often blocked |
| Tooling | `fetch` + `EventSource` | Specialized client libs |

Use SSE for: live notifications, progress feeds, log tails, LLM token streaming, dashboard updates.

## Quick Start

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
    .SharkSse();   // DSL: skip idempotency + declare text/event-stream in OpenAPI
```

- `Results.Extensions.Sse(handler)` returns a streaming `IResult`.
- `.SharkSse()` marks the endpoint as a stream: idempotency buffering is skipped (streams cannot be replayed) and the `text/event-stream` response is declared in the generated OpenAPI document.
- The pipeline's ETag and response-cache-profile middleware already skip `text/event-stream` responses by content type, so events reach clients unbuffered.

## SseEventWriter API

| Method | Purpose |
|---|---|
| `WriteEventAsync(data, eventType?, id?, retryMs?)` | Emit one event (multi-line payloads are split per SSE spec) |
| `WriteCommentAsync(comment)` | Emit `: comment` keep-alive line |
| `FlushAsync()` | Flush buffered bytes immediately |

`retryMs: 0` is honored (spec: "do not reconnect"). `CancellationToken` is observed throughout; disconnects surface as `OperationCanceledException` in the handler.

## Idempotency interaction

SSE endpoints must never be replayed — a stream is consumed as it is produced. `.SharkSse()` attaches `NoIdempotencyMetadata`, so requests with an `Idempotency-Key` header stream directly instead of being buffered and replayed. Endpoints without `.SharkSse()` keep the standard buffering behavior.

## OpenAPI

`.SharkSse()` declares the response as `text/event-stream` (schema `string`) in the generated document:

```json
"200": { "description": "OK", "content": { "text/event-stream": { "schema": { "type": "string" } } } }
```

## Native AOT

The SSE writer emits plain UTF-8 bytes — no reflection, no JSON serialization — so it works under Native AOT publishing with zero trimming configuration.
