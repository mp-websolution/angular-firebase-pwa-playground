# 02: One check command and a module graph command

**Spec:** `.scratch/agent-streamlining/spec.md`

**What to build:** An agent runs one command, `npm run check`, to get every check that needs no emulator, in CI's order (lint, format check, unit tests once, production build), stopping at the first failure, and it passes locally exactly when CI's lint-test-build job does, because Prettier now ignores `.claude/` and that CI job calls `npm run check` as its single check step. An agent reviewing architecture runs `npm run deps:graph` to print Sheriff's export of the project's files, modules, tags and imports instead of writing an import-graph script. The README's scripts table lists both, and its "CI also runs format:check" line and Updates check list point at `npm run check` plus `npm run test:integration`.

**Blocked by:** None (can start immediately)

**Status:** agent-done

- [x] `npm run format:check` passes on a checkout with worktrees under `.claude/`
- [x] `npm run check` runs lint, format check, unit tests (no watch) and build, and stops at the first failure
- [x] CI's lint-test-build job runs `npm run check` as one step; install and the integration job are unchanged
- [x] `npm run deps:graph` prints Sheriff's JSON export for the entry file in the Sheriff config
- [x] README scripts table, format-check line and Updates section updated
- [x] Verification (`npm run check` output, `deps:graph` sample, CI green) recorded in the PR, not committed
