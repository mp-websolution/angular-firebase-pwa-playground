# 07: Baseline drift check in Projects' CI

**Spec:** `.scratch/baseline-downstream-repos/spec.md`

**What to build:** A Project PR that changes a Baseline file fails before it becomes a merge conflict. An npm script finds the newest `baseline-v*` tag reachable from HEAD, lists files added, changed or deleted since, drops those matching the Feature, Project-owned and shared groups, and fails naming the rest. It fails clearly when no Baseline release is reachable. The checks workflow runs it with full history and tags, only when the repository is not the Template. It is not part of `npm run check`. See the spec's "Baseline drift check" decision.

**Blocked by:** 06 (Update script; its git fixtures)

**Status:** ready-for-agent

- [ ] Script tests: passes when only Feature, Project-owned or shared files changed
- [ ] Fails and names a changed, added or deleted Baseline file
- [ ] Compares against the newest reachable release after a second merge
- [ ] Fails clearly with no reachable release
- [ ] The checks workflow runs it in Projects only, with full history and tags
- [ ] The Baseline manual describes the check; `npm run check` passes
