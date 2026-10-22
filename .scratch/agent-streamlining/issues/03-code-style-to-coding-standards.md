# 03: Code style moves to CODING_STANDARDS.md

**Spec:** `.scratch/agent-streamlining/spec.md`

**What to build:** An implementing agent's always-loaded `AGENTS.md` holds only navigation pointers and the Workflow section, and the reviewer finds the code-style rules in a root `CODING_STANDARDS.md`, where the code-review skill looks. The "Code style" section moves word for word (Readability over DRY, Comments and naming, Module-private files, Component templates, Signal forms), except that the `//TODO human-review this rule & exceptions` note is deleted. `AGENTS.md` gets a one-line pointer in its place: code style lives in `CODING_STANDARDS.md`, which overrides the `angular-developer` skill where they disagree (signal forms, templates). Cross-references follow: `docs/agents/testing.md`'s "Comments and naming" pointer, and the README's docs table.

**Blocked by:** None (can start immediately)

**Status:** agent-done

- [x] `CODING_STANDARDS.md` holds the moved section; a diff against the old `AGENTS.md` text shows only the TODO removal
- [x] `AGENTS.md` keeps Agent skills and Workflow plus the one-line pointer, and no code-style rules
- [x] No doc still points at `AGENTS.md` for a code-style rule
- [x] README docs table lists `CODING_STANDARDS.md`
