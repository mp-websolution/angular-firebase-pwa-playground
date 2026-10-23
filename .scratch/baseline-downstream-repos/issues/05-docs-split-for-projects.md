# 05: Docs split for Projects

**Spec:** `.scratch/baseline-downstream-repos/spec.md`

**What to build:** A Project can have its own front page, terms, decisions and agent notes without editing Baseline docs. The README's content moves into a Baseline manual in the docs; the README becomes a short Project-owned intro linking to it. Setup describes creating a Project by cloning with history and keeping the Template as `upstream`, and drops "Use this template". The domain docs turn multi-context: a context map points at the Baseline glossary and a Project glossary, and ADRs are read from the Baseline and Project ADR folders (own numbering). The Baseline's agent instructions link to an optional Project agents file. See the spec's "Docs split" decision.

**Blocked by:** 04 (Projects and Baseline releases defined)

**Status:** agent-done

- [ ] The Baseline manual holds today's README content; the README is a short intro linking to it
- [ ] Setup creates a Project by clone + `upstream` remote and warns against "Use this template"
- [ ] A context map points at both glossaries; the domain docs guidance covers both ADR folders
- [ ] The agent instructions link to the optional Project agents file
- [ ] Links between docs resolve; `npm run check` passes
