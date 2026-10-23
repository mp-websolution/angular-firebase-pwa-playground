# Spec: Streamline the agent environment

Status: agent-done

## Problem Statement

A retro of the last 10 agent sessions (16–21 Oct) found the agents paying for gaps in this repo's environment, not for gaps in the tasks:

- **Closing work is undefined.** `/implement` and `/implement-spec` say to resolve tickets "the way the issue tracker closes work", but `docs/agents/issue-tracker.md` defines resolving only for wayfinding. Agents grepped `Status:` lines to guess, and no ticket was ever moved off `ready-for-agent`, so finished tickets look ready to be picked up again.
- **Code style rides in every implementer's context.** About 75 of `AGENTS.md`'s 110 lines are code style, loaded on every turn, though the reviewer is the one who enforces it. Every code review looked for `CODING_STANDARDS.md`, found none, and fell back to reading all of `AGENTS.md`. The 10-line template limit is a mechanical rule that only a reviewer catches today. A stale `//TODO human-review` note sits in the readability rule.
- **`npm run format:check` fails locally.** Prettier also checks the agent worktrees under `.claude/worktrees/` (53 warnings). The rebase session worked around it with `prettier --check $(git ls-files)`, so the check the agent trusts locally isn't the one CI runs.
- **No single check command.** Every implementing session strung together lint, format check, unit tests and build by hand, each with its own `tail`.
- **Module graphs get hand-rolled.** Four architecture sessions wrote throwaway import-graph scripts in `/tmp`, though Sheriff already exports the project's graph.
- **Lint boundaries are verified by hand.** Specs ask for throwaway violating imports (insert with `sed`, run lint, revert) to prove Sheriff fails as intended. It is repeated per PR, error-prone (one session got the relative path wrong first), and nothing re-checks it after the PR merges.

## Solution

- Implement skills close work by setting the implemented ticket, and the spec once all its tickets are done, to a new status, **`agent-done`**. They stop there: the human decides how to proceed and when to merge.
- Code style moves from `AGENTS.md` to a new root `CODING_STANDARDS.md`, which the reviewer reads. `AGENTS.md` keeps navigation pointers and the Workflow section. The template limit becomes a lint rule, at angular-eslint's default of 3 lines; the other rules stay written. The stale TODO goes.
- Prettier ignores `.claude/`, so `npm run format:check` passes locally exactly as in CI.
- **`npm run check`** runs every check that needs no emulator, in CI's order, and CI's lint-test-build job calls it.
- **`npm run deps:graph`** prints Sheriff's export of the project's files, modules, tags and imports.
- A **Sheriff test** suite proves that lint fails for the imports ADRs 0005–0007 forbid, and passes for allowed ones. It runs inside `npm run check`, so CI covers it on every PR.

## User Stories

1. As the human maintainer, I want an implement skill to set each ticket it finished to `agent-done`, so that I can see what waits for my review.
2. As the human maintainer, I want the spec set to `agent-done` once all its tickets are, so that a spec's status tells me whether its whole implementation waits for me.
3. As the human maintainer, I want implement skills to stop at an open PR and never merge, so that I decide how to proceed and when to merge.
4. As an agent running `/implement-spec`, I want the issue tracker doc to say how to close work, so that I don't grep old tickets and PRs to guess.
5. As an agent scanning `.scratch/` for a frontier, I want finished tickets to carry a status other than `ready-for-agent`, so that I don't pick up done work.
6. As an agent reading the triage labels, I want `agent-done` listed beside the five triage roles with its meaning, so that I don't confuse it with `ready-for-human`, which keeps meaning "a human must implement this".
7. As an implementing agent, I want `AGENTS.md` to hold only pointers and workflow, so that my context isn't spent on rules the reviewer enforces.
8. As a reviewing agent, I want the code-style rules in `CODING_STANDARDS.md`, so that the code-review skill finds the standards where it looks.
9. As an implementing agent, I want a pointer in `AGENTS.md` saying `CODING_STANDARDS.md` overrides the `angular-developer` skill where they disagree, so that I don't write a signal form the reviewer will reject.
10. As a developer, I want `npm run lint` to fail on an inline template longer than angular-eslint's default limit of 3 lines, so that the rule holds without a reviewer.
11. As a developer, I want an inline template of 3 lines or fewer to pass lint, so that short templates stay inline.
12. As a reviewing agent, I want the comment, naming, TSDoc, readability, module-private-files and signal-forms rules kept word for word in `CODING_STANDARDS.md`, so that nothing is lost in the move.
13. As the human maintainer, I want the `//TODO human-review` note removed, so that the standards carry no stale sediment.
14. As a doc reader, I want `docs/agents/testing.md` to point at `CODING_STANDARDS.md` for "Comments and naming", so that the cross-reference still lands.
15. As an agent running checks locally, I want `npm run format:check` to ignore `.claude/`, so that worktrees in the checkout don't fail it.
16. As an agent, I want one `npm run check` command, so that I don't assemble the check commands by hand each session.
17. As an agent, I want `npm run check` to stop at the first failing step, so that its output ends at the failure.
18. As the human maintainer, I want CI's lint-test-build job to call `npm run check`, so that local checks and CI cannot drift apart.
19. As a developer, I want `npm run check` to leave out the integration tests, so that it runs without Java or the emulators; CI keeps running those in its own job.
20. As an agent reviewing architecture, I want `npm run deps:graph` to print the module graph, so that I don't write import-graph scripts.
21. As an agent, I want the README's scripts table to list `npm run check` and `npm run deps:graph`, so that I find them where the other scripts are described.
22. As a developer, I want a Sheriff test proving a Baseline module importing a Feature fails lint, so that ADR 0005's main rule can't silently stop working.
23. As a developer, I want a Sheriff test proving a Feature importing another Feature fails lint, so that Features stay deletable.
24. As a developer, I want a Sheriff test proving production code importing the test helpers fails lint, so that test code stays out of the bundle.
25. As a developer, I want a Sheriff test proving a spec may import the test helpers, so that the specs' `'*'` exemption keeps working.
26. As a developer, I want a Sheriff test proving one module importing another module's `internal/` file fails lint, so that ADR 0006's encapsulation holds.
27. As a developer, I want a Sheriff test proving the app routes importing a Baseline page fails lint, so that ADR 0007 holds.
28. As a developer, I want Sheriff tests proving allowed imports pass (a Baseline module using auth's public guard, a Feature using a Baseline module), so that the suite catches rules that grow too strict.
29. As a developer, I want the Sheriff tests named after the rule they pin and the ADR behind it, so that a failing test names what broke.
30. As a developer, I want the Sheriff tests to leave no fixture behind, even when a test fails, so that a crashed run doesn't break the build or the next lint.
31. As a spec writer, I want throwaway-violation checks gone from future specs' verification lists, so that a PR records the Sheriff test run instead.
32. As a developer, I want `npm run check` to run the Sheriff tests, so that CI runs them on every PR.
33. As a developer, I want the Sheriff tests to finish in a few seconds, so that `npm run check` stays quick enough to run before every commit.

## Implementation Decisions

- **Closing work (`docs/agents/issue-tracker.md`).** A new section, "When a skill says to close work": `/implement` and `/implement-spec` set each implemented ticket's status line to `agent-done`, and the spec's too once every ticket is; they commit that on the implementation branch, open the PR, and stop. The human decides what happens next and when to merge. What happens to statuses after a merge is the human's call; this spec defines nothing past `agent-done`.
- **`agent-done` status (`docs/agents/triage-labels.md`).** A new row below the five triage roles: `agent-done`, meaning an agent implemented it; a human reviews, decides how to proceed and when to merge. It is a repo-local status, not one of the skills' canonical roles, so the table marks it as such. `ready-for-human` keeps its meaning unchanged.
- **`CODING_STANDARDS.md`** at the repo root gets the current "Code style" section of `AGENTS.md` as a move, not a rewrite: Readability over DRY, Comments and naming, Module-private files, Signal forms. Two changes only: the `//TODO human-review this rule & exceptions` note is deleted, and the "Component templates" section is replaced by the lint rule below.
- **`AGENTS.md`** keeps "Agent skills" and "Workflow". In place of "Code style" it gets a one-line pointer: code style lives in `CODING_STANDARDS.md`, which overrides the `angular-developer` skill where they disagree (signal forms), and that lint caps inline templates at angular-eslint's default of 3 lines.
- **Template rule.** angular-eslint's `component-max-inline-declarations`, in its default config (templates 3 lines, styles 3, animations 15), is enabled in the TypeScript block of the ESLint config. That block already registers the angular-eslint plugin. Any existing violation moves to a `templateUrl` file. The comments-in-function-bodies and signal-forms rules stay written rules, with no lint check.
- **Prettier** ignores `/.claude/`. `ng lint` already checks only `src/`, so ESLint needs no change.
- **`npm run check`** runs, in order and stopping at the first failure: lint, the Sheriff tests, format check, unit tests once (no watch), production build. CI's lint-test-build job replaces its separate lint, format, test and build steps with one `npm run check` step; install and the integration job stay as they are.
- **`npm run deps:graph`** runs `sheriff export` on the entry file from `sheriff.config.ts` and prints Sheriff's JSON (per file: module, tags, imports). Turning it into module-level edges is left to the reader.
- **Sheriff tests**, a new test seam:
  - Vitest in Node (`vitest` is already a direct dev dependency), run by a `test:sheriff` script with its own small Vitest config.
  - The test files live outside `src/`, so neither the Angular unit-test builder nor `ng lint` picks them up.
  - They drive ESLint's Node API with the repo's real ESLint config, the same rules `npm run lint` applies.
  - **Fixtures are real files.** Sheriff can't judge in-memory source: `lintText` with a virtual path fails with Sheriff's "internal error: FsPath" (probed). Each test writes a uniquely named fixture into the module folder it needs, and the suite removes every fixture in `afterAll`, which runs even when a test fails. A probe confirmed this works in about 2 s for three files. The Feature-to-Feature case also creates, and then removes, a throwaway Feature folder.
  - **Fast.** One ESLint instance for the whole suite. Every fixture is written up front, all of them are linted in a single `lintFiles` call, and each test asserts on its own file's result, so Sheriff builds its project graph once. Target: the suite finishes in a few seconds, well under the unit tests. It never shells out to `ng lint`.
  - Assertions check the rule id (`@softarc/sheriff/dependency-rule`, `@softarc/sheriff/encapsulation`), not message wording.
- **README.** The scripts table gains `npm run check` and `npm run deps:graph`. "CI also runs `npm run format:check`" and the Updates section's list of checks become `npm run check` plus `npm run test:integration`. The docs file table gains `CODING_STANDARDS.md`.

## Testing Decisions

- **A good test here** checks what lint decides for an import, never how Sheriff reaches that decision: a fixture goes in, and a rule id comes out or doesn't.
- **One new seam: the Sheriff tests.** It is the highest point possible: the same ESLint API and config `npm run lint` uses, with nothing faked. It replaces the per-PR throwaway-violation checks of the encapsulation and baseline-routes specs. The cases are user stories 22–28. The template limit gets no test: it is angular-eslint's default config, with no bound of ours to pin.
- **Prior art.** The Node-environment specs (`// @vitest-environment node`, e.g. the avatar rules spec) for Vitest outside jsdom; the test-naming rule in `docs/agents/testing.md`.
- **Checked by running, not by tests.** `npm run check` passing on a checkout that has worktrees under `.claude/`; `npm run deps:graph` printing JSON; CI's lint-test-build job going green with the single step. Record these in the PR.
- **Docs changes** (issue tracker, triage labels, `AGENTS.md`, `CODING_STANDARDS.md`, README) get no tests. Review checks that the code-style text moved word for word, apart from the two stated changes.

## Out of Scope

- A pre-commit hook.
- Lint checks for comments in function bodies or for the signal-forms shape (`(submit)`, `novalidate`).
- Documenting the PR conventions agents rediscovered (spec commits ride the implementation PR, verification goes in the PR body), and normalizing the mixed `Status:` / `**Status:**` formats.
- Back-filling statuses of tickets implemented before this spec.
- A status after `agent-done`, or any post-merge step.
- Pruning the stale worktrees under `.claude/worktrees/`. It's a local clean-up, not a repo change.
- A wrapper for the per-command git SSH setup, and the architecture skill's Mermaid render check (retro items 7 and 8).
- A module-level summary of `deps:graph` output.

## Further Notes

- Source: the retro of 10 agent sessions in this checkout (16–21 Oct 2026), items 1–6.
- Branch: `retro/agent-streamlining1`, off `main`, chosen by the human. One spec-level change, one PR.
- `agent-done` instead of widening `ready-for-human`: other skills (e.g. triage) read `ready-for-human` as "a human must implement this", so that meaning stays.
