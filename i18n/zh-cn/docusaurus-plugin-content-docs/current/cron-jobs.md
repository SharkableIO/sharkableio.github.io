# 定时任务（Cron Jobs）

Sharkable 内置完整的 cron 引擎：6 字段 cron 表达式、重试/超时/并发选项、运行时管理 API、管理端点，以及**分布式执行锁**——多实例部署下每个任务只执行一次。

## 快速开始

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureCronJobs(async scheduler =>
    {
        await scheduler.RegisterAsync(new CronJob(
            name: "daily-report",
            cron: "0 0 9 * * *",          // 6 字段：秒 分 时 日 月 星期
            handler: async (CancellationToken ct) =>
            {
                await GenerateDailyReportAsync(ct);
            },
            options: new CronJobOptions
            {
                Description = "每天 09:00 生成日报",
                RetryCount = 3,
                RetryDelay = TimeSpan.FromSeconds(5),
                Timeout = TimeSpan.FromMinutes(5),
            }));
    });
});
```

任务随宿主启动自动运行。调度器能容忍单个 handler 失败（带退避重试），不会拖垮整个宿主。

## Cron 表达式格式

六个字段，空格分隔：

```
┌───────────── 秒 (0-59)
│ ┌─────────── 分 (0-59)
│ │ ┌───────── 时 (0-23)
│ │ │ ┌─────── 日 (1-31)
│ │ │ │ ┌───── 月 (1-12)
│ │ │ │ │ ┌─── 星期 (0-7，0/7 为周日)
│ │ │ │ │ │
* * * * * *
```

支持的语法：`*`、`*/step`、逗号列表 `1,2,5`、范围 `10-30`、范围步进 `10-30/5`、无范围步进 `N/5`（从 N 到字段最大值）、`?`（等同 `*`，常用于日期字段）。星期字段接受 `7` 表示周日（标准 cron 方言）。解析器 AOT 安全，正则带超时上限（防 ReDoS）。

| 表达式 | 含义 |
|---|---|
| `0 0 9 * * *` | 每天 09:00:00 |
| `0 */5 * * * *` | 每 5 分钟 |
| `30 0 0 * * 1` | 每周一 00:00:30 |
| `0 0 12 1 1 *` | 1 月 1 日中午 |
| `0 0 * * * 7` | 每周日，每小时 |

## 任务选项

| 选项 | 默认值 | 用途 |
|---|---|---|
| `Description` | `null` | 显示在管理端点/日志中 |
| `RetryCount` | `0` | handler 失败后的重试次数 |
| `RetryDelay` | `5s` | 重试间隔 |
| `Timeout` | `null` | 单次执行超时（超时取消任务） |
| `Paused` | `false` | 以暂停状态启动——cron tick 被忽略直到恢复 |
| `Concurrency` | `SkipIfRunning` | `SkipIfRunning` 上次未结束时跳过本次 tick；`AllowConcurrent` 从不等待 |

## 运行时管理

任意位置注入 `ICronScheduler`：

```csharp
public class JobAdminService
{
    private readonly ICronScheduler _scheduler;
    public JobAdminService(ICronScheduler scheduler) => _scheduler = scheduler;

    public async Task ManualRunAsync(string name) =>
        await _scheduler.TriggerAsync(name);   // 立即执行，无视调度

    public async Task PauseAsync(string name) => await _scheduler.PauseAsync(name);
    public async Task ResumeAsync(string name) => await _scheduler.ResumeAsync(name);
    public async Task ListAsync() => await _scheduler.ListAsync();
}
```

### 管理端点

`GET /_sharkable/jobs` 返回每个任务的名字、描述、cron 表达式、运行状态、下次/上次运行时间、最后错误、运行次数与暂停状态。

- 默认受 API key 保护（`CronAdminRequireApiKey = true`）——未认证请求返回 **404**（不泄露端点存在性）。仅当前端已有其他认证层时才设置 `opt.CronAdminRequireApiKey = false`。
- 未配置任何 API key 时端点恒返回 404。
- 不进入 OpenAPI 文档（内部端点）。

## 分布式执行（多实例）

默认每个实例都执行任务（`MemoryCronJobStore`，无协调）。需要跨实例只执行一次时：

1. 安装 Redis 插件：`dotnet add package Sharkable.Cache.Redis`
2. 注册 Redis（`AddSharkableRedis` 会注册 `IConnectionMultiplexer` 与内置存储），并替换 cron 存储：

```csharp
builder.Services.AddSharkableRedis("localhost:6379");

builder.Services.AddShark(opt =>
{
    opt.CronJobStoreFactory = sp =>
        new RedisCronJobStore(sp.GetRequiredService<IConnectionMultiplexer>());
});
```

分布式存储提供：

| 能力 | 说明 |
|---|---|
| **分布式锁** | `TryAcquireJobLockAsync`（SET NX EX）——只有拿到锁的实例执行任务 |
| **锁续期** | 长时间运行的任务自动续租 |
| **防脑裂** | 释放用 Lua check-and-delete——节点永远无法释放其他节点的锁 |
| **锁 TTL** | `ICronScheduler.CronLockTtl`（默认 10 分钟）；设为 `TimeSpan.Zero` 可关闭加锁 |
| **状态持久化** | 运行次数、暂停标记、最后错误重启后不丢失 |

锁持有期间，其他实例看到任务被锁会跳过本 tick。持锁实例宕机后，锁在 TTL 到期自动过期，其他实例接管——无需人工清理。

## 替换存储

`ICronJobStore` 是公开接口，任何存储都能通过 `CronJobStoreFactory` 接入（PostgreSQL、SQL Server 等）。默认的 `MemoryCronJobStore` 是 internal 实现——工厂模式即官方扩展点。
