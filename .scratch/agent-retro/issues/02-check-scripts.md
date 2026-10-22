# 02: Check scripts

**Spec:** `.scratch/agent-retro/spec.md`

**What to build:** Add `/.claude/` to `.prettierignore`. Add `npm run check` (lint, format:check, `test -- --watch=false`, build, stopping at the first failure) and `npm run deps:graph` (`sheriff export src/main.ts`) to `package.json`. Replace the four `run` steps of `checks.yml`'s lint-test-build job with `npm run check`. Add both commands to the README's command table. Ticket 03 adds the lint tests to `check` later. `AGENTS.md` is not touched (ticket 04 owns it).

**Blocked by:** none

**Status:** resolved
