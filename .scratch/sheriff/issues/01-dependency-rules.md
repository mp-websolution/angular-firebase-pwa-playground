# 01: Dependency rules

**Spec:** `.scratch/sheriff/spec.md`

**What to build:** Sheriff enforcing the Baseline/Feature import rules through `npm run lint`: both packages pinned to `0.20.0`, the Sheriff config at the repo root exactly as in the spec's "Config" decision, one ESLint block, ADR 0005, and the three `docs/features.md` lines. Verification (lint green, four throwaway violations, `npx sheriff list`, lint time before and after) is recorded in the PR, not committed.

**Blocked by:** none

**Status:** ready-for-agent
