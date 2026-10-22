# 04: Lint tests for the module boundaries

**Spec:** `.scratch/agent-streamlining/spec.md`

**What to build:** A developer can trust that lint still enforces ADRs 0005–0007 without throwaway violating imports per PR: a lint test suite (Vitest in Node, `npm run test:lint`, test files outside `src/`) runs the repo's real ESLint config through ESLint's Node API against real fixture files and checks which rule fires. It runs inside `npm run check`, so CI runs it on every PR. Cases are the spec's user stories 22–28: Baseline → Feature, Feature → Feature (throwaway Feature folder), production code → test helpers fail; a spec → test helpers passes; another module's `internal/` file and the app routes → a Baseline page fail; a Baseline module → auth's public guard and a Feature → a Baseline module pass. Keep it fast as the spec's Implementation Decisions say: one ESLint instance, all fixtures written up front and linted in one call, removed in `afterAll`.

**Blocked by:** 02 (One check command and a module graph command)

**Status:** agent-done

- [x] Each case asserts on the rule id (`@softarc/sheriff/dependency-rule`, `@softarc/sheriff/encapsulation`), not message text
- [x] Tests named after the rule they pin and its ADR (per `docs/agents/testing.md`)
- [x] No fixture file or folder remains after a run, including a run with a failing test
- [x] The suite finishes in a few seconds
- [x] `npm run check` runs `test:lint` right after lint; unit-test builder and `ng lint` don't pick the suite up
