# Cron Jobs

Sharkable ships a full-featured cron engine: 6-field cron expressions, retry/timeout/concurrency options, a runtime management API, an admin endpoint, and **distributed execution locks** so multi-instance deployments run each job exactly once.

## Quick Start

```csharp
builder.Services.AddShark(opt =>
{
    opt.ConfigureCronJobs(async scheduler =>
    {
        await scheduler.RegisterAsync(new CronJob(
            name: "daily-report",
            cron: "0 0 9 * * *",          // 6-field: second minute hour day month weekday
            handler: async (CancellationToken ct) =>
            {
                await GenerateDailyReportAsync(ct);
            },
            options: new CronJobOptions
            {
                Description = "Generates the daily report at 09:00",
                RetryCount = 3,
                RetryDelay = TimeSpan.FromSeconds(5),
                Timeout = TimeSpan.FromMinutes(5),
            }));
    });
});
```

Jobs start automatically when the host starts. The scheduler survives individual handler failures (retry with backoff) and never tears down the host.

## Cron Expression Format

Six fields, space-separated:

```
┌───────────── second (0-59)
│ ┌─────────── minute (0-59)
│ │ ┌───────── hour (0-23)
│ │ │ ┌─────── day of month (1-31)
│ │ │ │ ┌───── month (1-12 or JAN-DEC)
│ │ │ │ │ ┌─── day of week (0-7, 0/7 = Sunday, or SUN-SAT)
│ │ │ │ │ │
* * * * * *
```

Supported syntax: `*`, `*/step`, `1,2,5` lists, ranges `10-30`, range-steps `10-30/5`, bare-steps `N/5` (from N to the field max), and `?` (treated as `*`, standard for day fields). The weekday field accepts `7` as Sunday (standard cron dialect). The parser is AOT-safe with a bounded regex timeout (ReDoS-proof).

| Expression | Meaning |
|---|---|
| `0 0 9 * * *` | Every day at 09:00:00 |
| `0 */5 * * * *` | Every 5 minutes |
| `30 0 0 * * 1` | Every Monday at 00:00:30 |
| `0 0 12 1 1 *` | January 1st at noon |
| `0 0 * * * 7` | Every Sunday, hourly |

## Job Options

| Option | Default | Purpose |
|---|---|---|
| `Description` | `null` | Shown in the admin endpoint / logs |
| `RetryCount` | `0` | Retry attempts after a handler failure |
| `RetryDelay` | `5s` | Delay between retries |
| `Timeout` | `null` | Per-execution timeout (job is cancelled when exceeded) |
| `Paused` | `false` | Start paused — cron ticks are ignored until resumed |
| `Concurrency` | `SkipIfRunning` | `SkipIfRunning` skips a tick if the previous run is still executing; `AllowConcurrent` never waits |

## Runtime Management

Inject `ICronScheduler` anywhere:

```csharp
public class JobAdminService
{
    private readonly ICronScheduler _scheduler;
    public JobAdminService(ICronScheduler scheduler) => _scheduler = scheduler;

    public async Task ManualRunAsync(string name) =>
        await _scheduler.TriggerAsync(name);   // run now, regardless of schedule

    public async Task PauseAsync(string name) => await _scheduler.PauseAsync(name);
    public async Task ResumeAsync(string name) => await _scheduler.ResumeAsync(name);
    public async Task ListAsync() => await _scheduler.ListAsync();
}
```

### Admin endpoint

`GET /_sharkable/jobs` returns every job's name, description, cron expression, running state, next/last run times, last error, run count and paused state.

- Protected by API key by default (`CronAdminRequireApiKey = true`) — unauthenticated requests get **404** (no existence leak). Set `opt.CronAdminRequireApiKey = false` only when another auth layer is in front.
- When no API keys are configured, the endpoint always returns 404.
- Not included in the OpenAPI document (internal endpoint).

## Distributed Execution (multi-instance)

By default jobs run on **every instance** (`MemoryCronJobStore` — no coordination). For exactly-once semantics across instances:

1. Install the Redis plugin: `dotnet add package Sharkable.Cache.Redis`
2. Register Redis (`AddSharkableRedis` wires `IConnectionMultiplexer` + the built-in stores) and replace the cron store:

```csharp
builder.Services.AddSharkableRedis("localhost:6379");

builder.Services.AddShark(opt =>
{
    opt.CronJobStoreFactory = sp =>
        new RedisCronJobStore(sp.GetRequiredService<IConnectionMultiplexer>());
});
```

The distributed store provides:

| Capability | Detail |
|---|---|
| **Distributed lock** | `TryAcquireJobLockAsync` (SET NX EX) — only the instance holding the lock runs the job |
| **Lock renewal** | Long-running jobs renew the lease automatically |
| **Split-brain safety** | Lua check-and-delete on release — a node can never release another node's lock |
| **Lock TTL** | `ICronScheduler.CronLockTtl` (default 10 min); set `TimeSpan.Zero` to disable locking |
| **State persistence** | Run counts, paused flags and last errors survive restarts |

While the lock is held, other instances see the job as locked and skip the tick. If the owning instance dies, the lock expires after the TTL and another instance takes over — no manual cleanup.

## Backing Store Replacement

`ICronJobStore` is a public interface; any store can be supplied via `CronJobStoreFactory` (PostgreSQL, SQL Server, etc.). The default `MemoryCronJobStore` is `internal` — the factory pattern is the supported extension point.
