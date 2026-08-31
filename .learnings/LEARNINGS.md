# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice

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
