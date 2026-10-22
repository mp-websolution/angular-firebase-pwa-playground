# 03: Lint rules and lint tests

**Spec:** `.scratch/agent-retro/spec.md`

**What to build:** In `eslint.config.js`, enable `component-max-inline-declarations` (`template: 10`), the `.html` `no-restricted-syntax` selectors for `(submit)` and `novalidate`, and a local rule `local/no-comments-in-function-bodies` in `lint-rules/`, as the spec's Implementation Decisions say. Fix any existing violations the way `AGENTS.md` "Comments and naming" and "Component templates" describe. Add `lint-rules/*.test.mjs`, run by `node --test` as `npm run test:lint`. It needs a rejected and an accepted case per custom rule, plus a Sheriff dependency-rule case and an encapsulation case. Add `test:lint` to `npm run check` before `build`. Add a short "Lint tests" section to `docs/agents/testing.md`: a new lint rule or boundary gets a case there, and specs no longer ask for throwaway violations. `AGENTS.md` is not touched (ticket 04 owns it).

**Blocked by:** 02

**Status:** ready-for-agent
