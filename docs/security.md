# Security Disclosure

This page tracks the security hardening work delivered across Sharkable core, `Sharkable.Cache.Redis`, and `Sharkable.AutoCrud.SqlSugar`. Each entry summarizes the fix; for the full audit context, see `local/security-audit.md` in each repository.

## Core library (`Sharkable`)

| ID | Summary |
|----|---------|
| [SHARK-SEC-003](#shark-sec-003) | Replace `Thread.Sleep` with `await Task.Delay` in graceful shutdown drain — prevent ApplicationStopping thread block |
| [SHARK-SEC-004](#shark-sec-004) | Make `SagaExecutor.LockTtl` configurable + add `LockRenewalInterval` with periodic lock extension — prevent split-brain sagas when step duration exceeds lock TTL |
| [SHARK-SEC-005](#shark-sec-005) | Replace unconditional `KeyDelete` with check-and-delete Lua in `RedisSagaStore.ReleaseLockAsync` / `RedisCronJobStore.ReleaseJobLockAsync`; add `CronScheduler.CronLockTtl` + `ICronJobStore.RenewJobLockAsync` — prevent split-brain when LockTtl expires mid-work (cross-repo with `Sharkable.Cache.Redis`) |
| [SHARK-SEC-006](#shark-sec-006) | **BREAKING** — Add `[CrudAllow]` attribute for explicit field allowlist on AutoCrud insert/update; endpoints with `Create \| Update` and zero `[CrudAllow]` properties now throw `InvalidOperationException` at startup. Prevents mass-assignment privilege escalation via JSON body (cross-repo with `Sharkable.AutoCrud.SqlSugar`) |
| [SHARK-SEC-007](#shark-sec-007) | Add JWT algorithm allowlist + `RequireSignedTokens` + `RequireExpirationTime` + reduce `ClockSkew` to 30s — prevent algorithm confusion attacks |
| [SHARK-SEC-008](#shark-sec-008) | Use `CryptographicOperations.FixedTimeEquals` for API key comparison — prevent timing oracle |
| [SHARK-SEC-009](#shark-sec-009) | Gate `ScalarJwtToken` / `ScalarApiKeyValue` to `IHostEnvironment.IsDevelopment()` — prevent token leakage to public `/scalar/v1` UI |
| [SHARK-SEC-010](#shark-sec-010) | Implement `AuditTrailMiddleware` header redaction per `RedactHeaders` list — credential-bearing headers (`Authorization`, `X-Api-Key`, `Cookie` by default) have their values replaced with `***` in audit log output |
| [SHARK-SEC-011](#shark-sec-011) | Add `SharkOption.RequireAuthenticatedByDefault` opt-in flag — enforce auth on framework endpoints via fallback policy |
| [SHARK-SEC-012](#shark-sec-012) | Add `ETagOptions.MaxResponseSize` (default 10 MiB) + counting stream + incremental hashing — prevent OOM via huge response bodies |
| [SHARK-SEC-013](#shark-sec-013) | Add `IMemoryCache` SizeLimit (100k) + periodic eviction sweep to `MemoryRateLimitStore` — prevent slow-loris DoS via unique path explosion |
| [SHARK-SEC-014](#shark-sec-014) | Add `IMemoryCache` SizeLimit (10k) + entry.Size tracking to `MemoryIdempotencyStore` — prevent TB-DoS via unique idempotency keys |
| [SHARK-SEC-015](#shark-sec-015) | Require API key on profiler endpoint `/_sharkable/profiler` by default; return 404 if no API keys configured; cap `top` slow-requests surface at 50 |
| [SHARK-SEC-016](#shark-sec-016) | Require API key on cron admin endpoint `/_sharkable/jobs`; redact `LastError` field to its first 100 characters + `...` to prevent business-logic leakage |
| [SHARK-SEC-017](#shark-sec-017) | **BREAKING** — Make `CronScheduler.Register` async; `ICronScheduler.Register` replaced by `RegisterAsync` returning `Task` — eliminate sync-over-async deadlock risk with distributed stores |
| [SHARK-SEC-028](#shark-sec-028) | Pin `Microsoft.OpenApi` to 2.7.5 — suppress NU1903 (CVE-2026-49451, circular schema stack overflow) |

## Plugin: `Sharkable.Cache.Redis`

| ID | Summary |
|----|---------|
| [SHARK-SEC-018](#shark-sec-018) | Redact `RedisHealthCheck` description — never expose endpoint topology or `ex.Message` on public `/healthz`; full diagnostic detail logged at `LogWarning` for operators only |
| [SHARK-SEC-019](#shark-sec-019) | Validate connection string at `AddSharkableRedis` — null-check + default `abortConnect=false` + optional TLS enforcement via `RedisStoreOptions.RequireTls` |
| [SHARK-SEC-020](#shark-sec-020) | Replace empty catch in `RedisIdempotencyStore.GetAsync` with typed exception filter + structured `LogWarning` + re-throw wrapped in `InvalidOperationException` — prevent silent double-execution when a corrupted record is encountered |
| [SHARK-SEC-021](#shark-sec-021) | Add `UseSharkableRedisHealthCheck()` extension — explicit opt-in to wire `RedisHealthCheck` into `HealthCheckService` under name `"redis"` and tag `"ready"`. The check is no longer auto-surfaced on `/healthz` by default |
| [SHARK-SEC-022](#shark-sec-022) | Set TTL on `RedisSagaStore.SaveProgressAsync` via `RedisStoreOptions.SagaProgressTtl` (default 7d) — prevent unbounded Redis key growth from orphaned saga progress records after host crashes |

## Plugin: `Sharkable.AutoCrud.SqlSugar`

| ID | Summary |
|----|---------|
| [SHARK-SEC-023](#shark-sec-023) | Add `AutoCrudSqlSugar.AutoCrudRequireAuthorization` opt-in flag — auto-attach `.RequireAuthorization()` to every generated CRUD endpoint when `true`. Default `false` preserves backward compat, but production deployments MUST enable. `AddSqlSugar()` logs a `LogWarning` at startup when the flag is `false` in non-AOT mode |
| [SHARK-SEC-024](#shark-sec-024) | Defense-in-depth: also exclude `SafeSoftDeleteField` from the `[CrudAllow]` allow-list by case-insensitive name match — protects entities whose C# property name matches the configured soft-delete column but lacks a `[SugarColumn]` rename |
| [SHARK-SEC-025](#shark-sec-025) | Add `AutoCrudSqlSugar.MaxPageNumber` (default 1M) + overflow check on `(page - 1) * pageSize` — prevent pagination DoS via `page=int.MaxValue` producing a negative OFFSET |
| [SHARK-SEC-026](#shark-sec-026) | Redact `SqlSugarHealthCheck` description — never expose `dbType` or `ex.Message` on public `/healthz`; full diagnostic detail (DB type, exception) logged at `LogWarning` for operators only |
| [SHARK-SEC-027](#shark-sec-027) | Escape SQL `LIKE` wildcards (`%`, `_`, `\`) with `ESCAPE '\'` clause + cap filter value length via `AutoCrudSqlSugar.MaxFilterValueLength` (default 200) + cap `IN` / `NOT IN` array size via `AutoCrudSqlSugar.MaxInArraySize` (default 100) in AutoCrud search — prevent LIKE wildcard DoS and large-`IN` clause DoS |

## Reporting vulnerabilities

Please report security issues privately via GitHub Security Advisories on the affected repository (`Sharkable`, `Sharkable.Cache.Redis`, or `Sharkable.AutoCrud.SqlSugar`). Do not open public issues for suspected vulnerabilities.