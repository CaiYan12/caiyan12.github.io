# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role, use the corresponding label string from this table.

## Reality on this repo's GitHub side (measured 2026-09-24)

The five strings above are the **skills' agreed vocabulary**, not a list of labels that exist. `gh label list --limit 100` on `CaiYan12/caiyan12.github.io` returns **13** labels:

`accessibility`, `bug`, `documentation`, `duplicate`, `enhancement`, `good first issue`, `help wanted`, `invalid`, `question`, `wontfix`, `dependencies`, `javascript`, `ready-for-agent`.

Of the five role strings, only two exist:

- `wontfix` — present (GitHub default)
- `ready-for-agent` — present (repo-specific, "Spec ready for agent implementation")
- `needs-triage`, `needs-info`, `ready-for-human` — **never created here**

Consequences for whoever follows this table:

1. Check before using: `gh label list`. Applying a missing label fails outright — measured on 2026-09-24, `gh issue edit 43 --add-label needs-triage` exits 1 with `failed to update https://github.com/CaiYan12/caiyan12.github.io/issues/43: 'needs-triage' not found` and leaves the issue's labels untouched.
2. If a role's label is genuinely needed, create it first (`gh label create …`) and then say so in the ticket, or record the decision to keep using only the two existing labels.
3. `AGENTS.md`（"Triage labels" 一节）records the same measured conclusion and is the authoritative copy — if the two documents ever disagree, that section of `AGENTS.md` wins, because it carries the actual observation rather than the vocabulary the skills assume.

This document deliberately does **not** drop the three strings that were then missing: they are what the engineering skills speak, and removing them would silently break the role → label mapping those skills expect.

## Current state (re-measured and completed 2026-10-06)

`gh label list --limit 100` on `CaiYan12/caiyan12.github.io` now returns **16** labels. The three role strings absent on 2026-09-24 were created on 2026-10-06:

| Label             | Color     | Description                              |
| ----------------- | --------- | ---------------------------------------- |
| `needs-triage`    | `#fbca04` | Maintainer needs to evaluate this issue  |
| `needs-info`      | `#d4c5f9` | Waiting on reporter for more information |
| `ready-for-human` | `#1d76db` | Requires human implementation            |

All five role strings in the table at the top of this file now exist in the tracker, so the mapping is directly usable: no `not found` failures, no create-then-use detour. The two from the earlier measurement are still present and unchanged — `wontfix` ("This will not be worked on", GitHub default) and `ready-for-agent` ("Spec ready for agent implementation", `#0e8a16`).

Point 3 of the earlier section still stands: `AGENTS.md`（"Triage labels" 一节）is the authoritative copy of this repo's label reality — if the two documents ever disagree, that section wins, because it carries the actual observation rather than the vocabulary the skills assume.
