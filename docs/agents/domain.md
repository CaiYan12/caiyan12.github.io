# Domain Docs

This repository uses a single domain context.

## Before exploring

- Read `CONTEXT.md` at the repository root.
- Read relevant records in `docs/adr/`.
- Use the vocabulary defined in `CONTEXT.md` in issue titles, specifications, test names, and implementation discussions.

## File structure

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

Create glossary entries lazily when project-specific terms are resolved. Create an ADR only for a hard-to-reverse, surprising decision that resulted from a real trade-off.
