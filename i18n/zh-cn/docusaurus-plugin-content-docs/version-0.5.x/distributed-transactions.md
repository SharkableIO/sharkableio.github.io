---
title: 分布式事务（SAGA）
---

# 分布式事务（SAGA）

Sharkable 提供 SAGA 模式的分布式事务系统：一组按顺序执行的步骤，每个步骤有正向操作和补偿（回滚）操作。任一步骤失败时，已完成的步骤按逆序执行补偿。

## 快速开始

### 1. 定义步骤

```csharp
public class CreateOrderStep : ISagaStep
{
    public async Task<SagaResult> ExecuteAsync(CancellationToken ct)
    {
        // 在数据库中创建订单
        return new SagaResult(true);
    }

    public async Task CompensateAsync(CancellationToken ct)
    {
        // 删除订单（回滚）
    }
}
```

### 2. 组装 Saga

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

### 3. 执行

```csharp
app.MapPost("/orders", async (CreateOrderSaga saga, SagaExecutor executor) =>
{
    var result = await executor.ExecuteAsync($"order:{orderId}", saga);
    return result.Success ? Results.Ok() : Results.Problem(result.Error);
});
```

## 工作原理

```
执行 step 0 → 成功 → 保存进度 → step 1 → 成功 → 保存 → step 2 → 失败
                                                        ↓
                                          补偿 step 1 ← 补偿 step 0
```

1. 获取分布式锁（防止并发执行同一事务）
2. 加载进度（崩溃恢复 — 从上次完成的步骤继续）
3. 顺序执行步骤，成功后保存进度
4. 失败时：反向补偿已完成的步骤
5. 释放锁

## 崩溃恢复

进度在每次步骤成功后保存到 `ISagaStore`。进程崩溃后，下次执行加载上次完成的步骤并从下一个步骤恢复。已完成的步骤不会重新执行。

## 分布式存储

`MemorySagaStore` 仅适用于开发环境。生产环境需要 Redis：

```bash
dotnet add package Sharkable.Cache.Redis
```

```csharp
services.AddSharkableRedis("localhost:6379");
// ISagaStore 自动切换为 RedisSagaStore（含分布式锁）
```

或自己实现 `ISagaStore`：

```csharp
builder.Services.AddShark(opt =>
{
    opt.SagaStoreFactory = sp => new MyDbSagaStore();
});
```

## 步骤间数据共享

步骤通过 `Saga.State.Data` 字典共享数据：

```csharp
public class CreateOrderStep : ISagaStep
{
    public async Task<SagaResult> ExecuteAsync(CancellationToken ct)
    {
        var orderId = Guid.NewGuid().ToString();
        State.Data["orderId"] = orderId;  // 后续步骤可访问
        return new SagaResult(true);
    }
}
```
