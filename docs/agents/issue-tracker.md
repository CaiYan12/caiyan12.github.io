# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `gh issue edit <number> --remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically when run inside this clone.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## When a skill says “publish to the issue tracker”

Create a GitHub issue.

## When a skill says “fetch the relevant ticket”

Run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only, the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.

## Wayfinding reality on this repo (measured 2026-10-14)

The conventions above are the skills' agreed vocabulary. What was actually verified against `CaiYan12/caiyan12.github.io` on 2026-10-14:

1. **Sub-issues are available.** `gh api repos/CaiYan12/caiyan12.github.io/issues/67/sub_issues` returns HTTP 200 with `[]` (an empty list, not a 404), so the feature is enabled on this repo. This is a **read** probe only — creating a child edge has not been exercised here, so don't treat the endpoint's response as proof that the write path works until one real edge is created.
2. **Native dependencies are available and already in use.** `.../issues/67/dependencies/blocked_by` returns 200, and issue #67 reports `issue_dependencies_summary.total_blocked_by: 1` — at least one real dependency edge already exists on this repo. Use the native edge, not the `Blocked by:` body convention.
3. **The database-id gotcha is real for this repo's numbering.** Issue #67's database id is `5610110573` while its `#number` is `67`; the `blocked_by` POST takes `issue_id=<db-id>`, so passing `67` would either fail or bind the wrong issue. Always `gh api repos/<owner>/<repo>/issues/<n> --jq .id` first.
4. **The five `wayfinder:*` labels do not exist yet.** `gh label list --limit 100` on 2026-10-14 returns **16** labels and none of them is `wayfinder:map`, `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`. `gh issue create --label wayfinder:map` will therefore fail with `'wayfinder:map' not found` and create nothing. Create the label first (`gh label create "wayfinder:map"`), or record the decision to run a map without labels. This is the same trap documented in `docs/agents/triage-labels.md`.
5. **`gh` works with the proxy unset.** Measured 2026-10-14: `gh issue list --state all --limit 1` succeeded **5/5** with `HTTP_PROXY`/`HTTPS_PROXY` unset and **3/3** with `HTTPS_PROXY=http://127.0.0.1:7897`. `gh run list` also succeeds both ways. So the proxy is not required for `gh`; don't add it reflexively.
6. **`api.github.com` was intermittently flaky for part of 2026-10-14; a failure looks like a network error, not an auth error.** Raw `curl https://api.github.com` returned `000`/exit 35 and `403` on different attempts, and `gh issue list` / `gh api` / `gh run list` each failed a few times with `net/http: TLS handshake timeout` or `EOF` before succeeding. The user then switched proxy nodes and everything became stable. Consequence: **a single `gh` failure here is not evidence that a command or its flags are wrong — retry before concluding anything.** (`gh run list` was initially unverifiable for exactly this reason and was confirmed working only after the node switch.)
7. **There are zero open issues but two open Dependabot PRs** (`#74`, `#75`, both `build(deps)` bumps, 2026-10-14). PRs are not a request surface here (see the flag above), so they are correctly absent from the triage queue; but note that "no open issues" does **not** mean the tracker is empty. Also note issue and PR numbers share one space: the highest number in use is `95`, while `gh issue list --state all` returns only **72** entries — the other 23 are PRs, so a bare `#93` must be resolved with `gh api repos/<owner>/<repo>/issues/<n>` (or `gh pr view`) rather than assumed to be an issue.
