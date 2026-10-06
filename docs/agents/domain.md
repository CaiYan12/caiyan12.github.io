# Domain Docs

This repository uses a single domain context.

## Before exploring

- Read `GLOSSARY.md` at the repository root.
- Read relevant records in `docs/adr/`.
- Use the vocabulary defined in `GLOSSARY.md` in issue titles, specifications, test names, and implementation discussions.

If any of these files don't exist, proceed silently. Don't flag their absence; don't suggest creating them upfront. Glossary entries and ADRs are created lazily, when terms or decisions actually get resolved.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0006 (第三方 widget：借形态，不借运行时), but worth reopening because…_

## File structure

```text
/
├── GLOSSARY.md
├── docs/adr/
└── src/
```

Create glossary entries lazily when project-specific terms are resolved. Create an ADR only for a hard-to-reverse, surprising decision that resulted from a real trade-off.
