# 01: Internal folders

**Spec:** `.scratch/encapsulation/spec.md`

**What to build:** Move every module-private file into its module's `internal/` folder so Sheriff's default `encapsulation` rule hides it: the credentials form (with template), auth failure model and return URL helpers in auth; everything in the notes Feature except its routes file, with the fake in `internal/testing/`. Only relative import paths change; the Sheriff config stays as it is. Add ADR 0006, fix the "every file stays public" sentence in ADR 0005, and update `docs/features.md`, `docs/agents/testing.md` and `AGENTS.md` as the spec's Implementation Decisions say. Verification (lint green, four throwaway violations, `npx sheriff list src/main.ts` before and after, tests and build green) is recorded in the PR, not committed.

**Blocked by:** none

**Status:** resolved
