# Configuration Validation

Sharkable automatically validates critical configuration at startup and fails fast with a clear error message, preventing runtime surprises.

## What Gets Validated

The validator runs at the end of `AddShark()`. It checks:

| Check | Condition | Error |
|---|---|---|
| JWT audiences | If `ConfigureJwt()` is called with audiences, at least one audience must be provided | `JwtAudiences: at least one audience is required` |
| JWT authority | If `ConfigureJwt()` is called, `authority` must not be null/empty | `JwtAuthority: authority is required` |
| Multi-tenant resolver | If `ConfigureMultiTenant()` is called, `ResolveTenant` delegate must be set | `TenantOptions.ResolveTenant: must be configured` |

## Failure Behavior

All validation errors are collected. If any fail, a `SharkConfigurationException` is thrown before the application starts:

```
Sharkable.SharkConfigurationException: Configuration validation failed:
  - JwtAudiences: at least one audience is required
  - TenantOptions.ResolveTenant: must be configured
```

## Opt-out

Configuration validation cannot be disabled. It is designed to catch misconfigurations at startup rather than at runtime. If a validation rule is too strict for your scenario, pass valid (even if dummy) values to satisfy it, or file an issue.
