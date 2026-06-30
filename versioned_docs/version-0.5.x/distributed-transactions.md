# Distributed Transactions (SAGA)

Sharkable provides a SAGA-pattern distributed transaction system: a sequence of steps where each step has a forward action and a compensating (rollback) action. If any step fails, previously-completed steps are compensated in reverse order.

## Quick Start

### 1. Define Steps

```csharp
public class CreateOrderStep : ISagaStep
{
    public async Task<SagaResult> ExecuteAsync(CancellationToken ct)
    {
        // create order in database
        return new SagaResult(true);
    }

    public async Task CompensateAsync(CancellationToken ct)
    {
        // delete order (rollback)
    }
}
```

### 2. Assemble Saga

```csharp
public class CreateOrderSaga : Saga
{
    public CreateOrderSaga()
    {
        AddStep(new CreateOrderStep());
        AddStep(new DeductInventoryStep());
        AddStep(new ChargePaymentStep());
        AddStep(new SendNotificationStep());
    }
}
```

### 3. Execute

```csharp
app.MapPost("/orders", async (CreateOrderSaga saga, SagaExecutor executor) =>
{
    var result = await executor.ExecuteAsync($"order:{orderId}", saga);
    return result.Success ? Results.Ok() : Results.Problem(result.Error);
});
```

## How It Works

```
Execute step 0 → OK → save progress → step 1 → OK → save progress → step 2 → FAIL
                                                                    ↓
                                              compensate step 1 ← compensate step 0
```

1. Acquire distributed lock (prevent concurrent saga execution)
2. Load progress (crash recovery — resume from last completed step)
3. Execute steps sequentially, saving progress after each success
4. On failure: compensate completed steps in reverse order
5. Release lock

## Crash Recovery

Progress is saved to `ISagaStore` after each successful step. If the process crashes mid-saga, the next execution loads the last completed step and resumes from the next one. Already-completed steps are NOT re-executed.

## Distributed Store

The default `MemorySagaStore` is in-process only — suitable for development. For production, install Redis store:

```bash
dotnet add package Sharkable.Cache.Redis
```

```csharp
services.AddSharkableRedis("localhost:6379");
// ISagaStore auto-swaps to RedisSagaStore with distributed locking
```

With custom key prefixes:

```csharp
services.AddSharkableRedis("localhost:6379", opt =>
{
    opt.SagaLockPrefix = "myapp:saga:lock:";
    opt.SagaProgressPrefix = "myapp:saga:progress:";
});
```

Or implement `ISagaStore` with your own database:

```csharp
builder.Services.AddShark(opt =>
{
    opt.SagaStoreFactory = sp => new MyDbSagaStore();
});
```

## Data Sharing Between Steps

Steps share state via `Saga.State.Data` dictionary:

```csharp
public class CreateOrderStep : ISagaStep
{
    public async Task<SagaResult> ExecuteAsync(CancellationToken ct)
    {
        var orderId = Guid.NewGuid().ToString();
        State.Data["orderId"] = orderId;  // available to subsequent steps
        return new SagaResult(true);
    }
}
```

## AOT Support

Fully AOT-compatible. No reflection, no `dynamic`.
