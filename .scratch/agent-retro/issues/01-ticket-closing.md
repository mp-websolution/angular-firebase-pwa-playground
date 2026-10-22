# 01: Ticket closing

**Spec:** `.scratch/agent-retro/spec.md`

**What to build:** Add a "Resolve a spec ticket" section to `docs/agents/issue-tracker.md` and a sentence about `resolved` to `docs/agents/triage-labels.md`, as the spec's Implementation Decisions say (status format, resolving on the integration branch before the PR is marked ready, spec commits in the PR, verification in the PR body). Rewrite every `Status` line under `.scratch/` to `**Status:** <value>`, and backfill `resolved` for tickets and specs whose work is merged into `origin/main`. Use `gh pr list -R mp-websolution/angular-firebase-pwa-playground --state merged` and `git log origin/main` to check. Leave `.scratch/agent-retro/` at `ready-for-agent`. `AGENTS.md` is not touched (ticket 04 owns it).

**Blocked by:** none

**Status:** resolved
