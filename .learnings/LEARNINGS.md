# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice

---

## [LRN-20260903-001] correction

**Logged**: 2026-09-03T11:31:04+08:00
**Priority**: medium
**Status**: resolved
**Area**: frontend

### Summary
Sidebar ranking badges need screenshot-based optical alignment, not geometric centering alone.

### Details
The Colorful sidebar hot-list badge changed from a circle to a narrow CSS flag. The first taller variant made the badge feel visually heavier and less balanced even though the flex box was mathematically centered. The accepted direction keeps a narrow flag with a downward convex tail and preserves the number’s alignment with the title row.

### Suggested Action
For small CSS shapes with clipped corners or tails, compare the rendered screenshot and the adjacent text baseline before finalizing dimensions; keep the correction scoped to the badge selector.

### Metadata
- Source: user_feedback
- Related Files: src/styles/global.css, src/components/widget/WidgetHotLog.astro
- Tags: sidebar, colorful, optical-alignment, css-shape

### Resolution
- **Resolved**: 2026-09-03T11:31:04+08:00
- **Notes**: Final sidebar state uses the narrow downward-convex flag badge requested by the user.

---

## [LRN-20260830-001] correction

**Logged**: 2026-08-30T21:50:00+08:00
**Priority**: high
**Status**: resolved
**Area**: frontend

### Summary
An Astro route can be a fully isolated microsite and must not automatically inherit the blog theme.

### Details
The `/domain/` migration requires the source site's complete DOM, CSS, assets, animations, and responsive behavior. Reusing the Colorful layout changed the requested visual identity.

### Suggested Action
For microsite migrations, distinguish Astro routing integration from visual-theme integration before implementation.

### Metadata
- Source: user_feedback
- Related Files: src/pages/domain.astro, src/components/layout/Navbar.astro
- Tags: astro, microsite, visual-fidelity

### Resolution
- **Resolved**: 2026-08-30T21:50:00+08:00
- **Notes**: Replaced the themed interpretation with a source-faithful isolated route.

---

## [LRN-20260902-001] correction

**Logged**: 2026-09-02T07:10:00Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
An HTTP 200 from the GoatCounter count endpoint does not prove that the pageview will appear in statistics.

### Details
The official GoatCounter server records browser-supplied bot hints, while the hourly aggregation skips hits marked as bots. The stats query includes the end hour (`hour <= end`), so a current-hour zero must be investigated through bot filtering, ignore rules, persistence, and path matching rather than assuming the hour boundary is exclusive.

### Suggested Action
When validating analytics from an automated browser, inspect the exact request parameters and use a normal browser session for the acceptance visit; treat the dashboard and API result as the source of truth.

### Metadata
- Source: error
- Related Files: scripts/sync-site-stats.mjs
- Tags: goatcounter, analytics, browser-automation, debugging

---
