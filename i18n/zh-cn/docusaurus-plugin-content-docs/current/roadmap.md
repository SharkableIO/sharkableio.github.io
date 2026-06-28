---
title: 路线图
---

# 路线图

> **核心原则**：功能通过约定自动发现或配置激活。用户永远不需要改变 `ISharkEndpoint` 编码模式，不需要实现新接口，不需要在业务代码中调用框架 API。

## v0.4.0 — 2026-06-28 ✅

- [x] 废弃 `[SharkEndpoint]` / `[SharkMethod]` / `SharkHttpMethod` 及相关反射基础设施 — 迁移到 `ISharkEndpoint`
- [x] **启动配置自检** — `ConfigurationValidator` 在 `AddShark()` 时校验 JWT、多租户配置
- [x] **优雅关闭** — K8s 友好的 SIGTERM 处理：/healthz → 503，排空请求，然后关闭
- [x] **审计日志批量/异步写入** — Channel 缓冲 + 后台刷新（`AsyncWrite`、`BatchSize`、`FlushInterval`）
- [x] **幂等性分布式存储** — `IIdempotencyStore` 可通过 `TryAddSingleton` 或 `IdempotencyStoreFactory` 替换
- [x] **限流分布式存储** — `IDistributedRateLimitStore` + `SharkRateLimiterMiddleware`，默认 `MemoryRateLimitStore`，`RateLimitStoreFactory`
- [x] **Sharkable.Cache.Redis NuGet 插件** — Redis 版 `IIdempotencyStore` + `IDistributedRateLimitStore`，`AddSharkableRedis()`

---

## Phase 1 — 现有功能强化（零侵入）

| # | 功能 | 价值 | 侵入度 | 状态 |
|---|------|------|--------|------|
| 1 | **启动配置自检** | 减少踩坑 | 零 — 自动运行 | ✅ v0.4.0 |
| 2 | **优雅关闭** | 生产必备 | 零 — K8s 原生 | ✅ v0.4.0 |
| 3 | **审计日志批量/异步** | 性能优化 | 零 — 仅内部机制 | ✅ v0.4.0 |
| 4 | **编译时路由冲突检测** | 质量保障 | 零 — NuGet 包自带 | |

## Phase 2 — 可观测性

| # | 功能 | 价值 | 侵入度 | 状态 |
|---|------|------|--------|------|
| 5 | **内置分布式追踪** | 可观测性 | 零 — `ActivitySource` | ✅ |
| 6 | **可扩展健康检查** | 运维 | 仅配置 | |
| 7 | **轻量性能面板** | 调试 | 仅配置 | ✅ |

## Phase 3 — 分布式 / 集群支持

| # | 功能 | 价值 | 侵入度 | 状态 |
|---|------|------|--------|------|
| 8 | **幂等性分布式存储接口** | 集群高可用 | 仅配置 | ✅ v0.4.0 |
| 9 | **多租户数据源隔离** | SaaS | 仅配置 | |
| 10 | **限流分布式存储接口** | 集群高可用 | 仅配置 | ✅ v0.4.0 |
| 11 | **自适应限流** | 鲁棒性 | 仅配置 | |

## Phase 4 — 开发者体验 & 打磨

| # | 功能 | 价值 | 侵入度 |
|---|------|------|--------|
| 12 | **ETag / 304 条件请求** | 缓存优化 | 零 — 自动 |
| 13 | **响应压缩** | 性能 | 仅配置 |
| 14 | **OpenAPI 示例生成** | 开发体验 | 零 — 自动 |
| 15 | **错误消息本地化** | 国际化 | 仅配置 |
| 16 | **AutoCrud AOT 零 rd.xml** | AOT 体验 | 零 — Source Generator |
| 17 | **软删除全局过滤器** | 数据层 | 实体标记接口 |
| 18 | **BackgroundService 增强** | 后台任务 | 零 — 自动 |
| 19 | **ProblemDetails (RFC 7807) 兼容** | 互操作性 | 零 — 自动 |

## 已排除（高侵入性）

| 功能 | 原因 |
|------|------|
| CQRS-lite (ICommand/IQuery) | 需重写每个端点类 |
| 模块化 ISharkModule | 需大面积重构 |
| 强类型 ID (OrderId, UserId) | 需改所有方法签名 |
| 智能枚举 | 需改所有枚举定义 |
| 缓存标签失效 | 需改写入端点 |
| API 测试运行器 | 需写新测试代码 |
| 轻量网关 | 需建新项目 |
| Source Generator SDK | 需新包 + 客户端代码 |
