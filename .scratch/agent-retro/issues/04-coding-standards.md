# 04: CODING_STANDARDS.md

**Spec:** `.scratch/agent-retro/spec.md`

**What to build:** Move everything under `AGENTS.md`'s "Code style" heading into a new root `CODING_STANDARDS.md`. Shrink each rule that ticket 03 made a lint rule to one line naming that rule, and drop the `//TODO human-review` marker. `AGENTS.md` keeps "Agent skills" and "Workflow" and gains two pointers: `CODING_STANDARDS.md`, and `npm run check` / `npm run deps:graph`. Repoint references to `AGENTS.md`'s code-style sections (e.g. `docs/agents/testing.md` "Comments and naming"). Follow the `writing-for-agents` skill for the pointer wording.

**Blocked by:** 03

**Status:** ready-for-agent
