# Errors

Command failures and integration errors.

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
