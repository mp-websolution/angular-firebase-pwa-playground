# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo is multi-context: the Baseline and the Project each have a glossary and an ADR folder. In the Template the Project's are empty starters; in a Project they hold its own terms and decisions. The skills say `GLOSSARY.md` and `GLOSSARY-MAP.md`; here they are `CONTEXT.md` and `CONTEXT-MAP.md`.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root: it points at both glossaries.
- **`CONTEXT.md`** at the repo root: the Baseline glossary.
- **`docs/project/CONTEXT.md`**: the Project glossary.
- **`docs/adr/`** (Baseline ADRs) and **`docs/project/adr/`** (Project ADRs): read the ADRs in both that touch the area you're about to work in.

If a Project file has no terms or ADRs yet, **proceed silently**. Don't flag their absence; don't suggest filling them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) adds to them when terms or decisions actually get resolved.

## File structure

```
/
├── CONTEXT-MAP.md
├── CONTEXT.md                 ← Baseline glossary
├── docs/
│   ├── adr/                   ← Baseline ADRs: 0001, 0002, …
│   └── project/
│       ├── CONTEXT.md         ← Project glossary
│       └── adr/               ← Project ADRs: their own 0001, 0002, …
└── src/
```

## Which context to write to

- **In the Template**, new terms and decisions about the Baseline go in `CONTEXT.md` and `docs/adr/`.
- **In a Project**, new terms and decisions go in `docs/project/CONTEXT.md` and `docs/project/adr/`, never in the Baseline's files: those are Baseline files, and changing them is Baseline drift (see `docs/upgrade-notes.md`). A term or decision the Baseline itself needs is made in the Template and merged down with a Baseline release.

Project ADRs are numbered from `0001` on their own: scan only `docs/project/adr/` for the highest number. Where a bare number could mean either folder, say "Baseline ADR 0008" or "Project ADR 0001".

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in either glossary. Don't drift to synonyms a glossary explicitly avoids. A Project term never redefines a Baseline term.

If the concept you need isn't in either glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR in either folder, surface it explicitly rather than silently overriding:

> _Contradicts Baseline ADR 0007 (Baseline page modules expose a routes file), but worth reopening because…_
