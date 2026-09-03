# Errors

Command failures and integration errors.

---

## [ERR-20260903-001] optional-eslint-check

**Logged**: 2026-09-03T11:31:04+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
The repository has no installed ESLint command or dependency.

### Error
```
Command "eslint" not found
```

### Context
- Attempted `pnpm exec eslint ./src` as an additional read-only pre-commit check.
- The repository CI workflow runs Prettier Check and Astro Check, not ESLint.

### Suggested Fix
Do not add ESLint as part of this sidebar task; if linting is desired later, define it explicitly in `package.json` and CI.

### Metadata
- Reproducible: yes
- Related Files: package.json, .github/workflows/lint.yml

### Resolution
- **Resolved**: 2026-09-03T11:31:04+08:00
- **Notes**: Recorded as an optional tooling boundary; no dependency or workflow change added.

---

## [ERR-20260902-001] computer-use

**Logged**: 2026-09-02T07:10:00Z
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
The browser automation URL policy rejected a data URL used to inspect a page runtime flag.

### Error
The browser use tool rejected the action because the requested data URL was blocked by browser security policy.

### Context
- Attempted to inspect `navigator.webdriver` without transmitting data.
- The existing article and GoatCounter pages remained available for normal browser inspection.
- No policy bypass or alternate raw browser protocol was attempted.

### Suggested Fix
Ask the user to inspect the value in their existing DevTools Console, or use a permitted page/runtime inspection capability.

### Metadata
- Reproducible: unknown
- Related Files: none

---
