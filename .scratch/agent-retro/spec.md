# Spec: Agent environment fixes from the October retro

**Status:** resolved

## Problem Statement

A retrospective over the last 10 agent sessions (16 to 21 October) found the same friction in run after run:

- **Closing tickets is undefined.** `docs/agents/issue-tracker.md` defines `resolved` only for wayfinder tickets. In 3 sessions agents grepped `Status:` lines to guess how to close a spec ticket, and in 3 more they read old PR bodies (#40, #41, #43) for the conventions. No ticket has ever been marked resolved, and the files mix `Status:` and `**Status:**`.
- **Code style rides in every implementer's context.** About 75 of `AGENTS.md`'s 110 lines are code style. Review agents look for `CODING_STANDARDS.md` first, find nothing, and fall back to the whole of `AGENTS.md`. Several of the rules are mechanical, so a reviewer enforces by reading what lint could enforce for free.
- **The local format check is broken.** `.prettierignore` doesn't skip `.claude/`, so `npm run format:check` fails on files in local worktrees under `.claude/worktrees/`. Agents work around it with `prettier --check $(git ls-files)`.
- **No single check command.** Every implementing session strings together lint, format check, unit tests and build by hand.
- **Import graphs are rebuilt by hand.** 4 architecture sessions wrote their own `/tmp` scripts to map module imports, though `sheriff export` already prints the graph.
- **Lint boundaries are verified by hand.** Specs ask for throwaway violations: insert an import with `sed`, run lint, revert. Nothing in CI proves the Sheriff rules still fail when they should.

## Solution

Write the ticket-closing procedure into the tracker doc and bring every existing ticket to one `Status` format, with merged work marked resolved. Fix `.prettierignore`, add `npm run check` (CI calls it) and `npm run deps:graph`. Turn the mechanical code-style rules into lint rules, and add a lint test suite that proves lint rejects what it should, Sheriff boundaries included, so CI runs it. Move the remaining judgement-call rules to `CODING_STANDARDS.md` and leave `AGENTS.md` as navigation pointers plus the workflow.

## User Stories

1. As an agent finishing a spec, I want the tracker doc to say how a ticket is resolved, so that I close tickets without reading old PRs.
2. As an agent opening a spec's PR, I want the doc to say that the spec commits travel in it and verification goes in its body, so that I follow the precedent without looking it up.
3. As a maintainer, I want every ticket and spec to use one `Status` format and merged work to read `resolved`, so that a grep tells me what is open.
4. As an agent, I want `npm run format:check` to pass on a clean checkout that has local worktrees, so that I can trust the check.
5. As an agent, I want one `npm run check` that runs what CI's lint-test-build job runs, so that a single command tells me whether a change is ready.
6. As a maintainer, I want CI to call `npm run check`, so that the local command and CI cannot drift.
7. As an agent reviewing architecture, I want `npm run deps:graph` to print the module dependency graph, so that I don't write an import scanner.
8. As a developer, I want lint to reject an inline template longer than 10 lines, so that the rule holds without review.
9. As a developer, I want lint to reject `(submit)` handlers and `novalidate` in templates, so that signal forms keep their one shape.
10. As a developer, I want lint to reject comments inside function bodies, apart from tool directives, so that explanations move to names and tests.
11. As a maintainer, I want a test suite that proves each custom lint rule and each Sheriff boundary rejects a violation and accepts the allowed case, so that a config change can't silently switch a rule off.
12. As a spec writer, I want the testing doc to point at that suite, so that new specs add a case there instead of asking for throwaway violations.
13. As an implementer, I want `AGENTS.md` to hold only navigation pointers and the workflow, so that my context carries no review-time rules.
14. As a reviewer, I want `CODING_STANDARDS.md` at the repo root with every judgement-call rule, so that the standards review reads one file.

## Implementation Decisions

- **Status format:** `**Status:** <value>` on its own line near the top, in every spec and ticket under `.scratch/`. Values are the five triage roles from `triage-labels.md` plus `resolved`.
- **Resolving a spec ticket:** on the integration branch, the ticket's line becomes `**Status:** resolved`, in a commit made before the PR is marked ready, so merging the PR closes the ticket. When every ticket of a spec is resolved or `wontfix`, the spec's line becomes `**Status:** resolved` in the same commit. The PR carries the spec and ticket commits (as #43, #44 and #48 did) and records verification results in its body; they are not committed.
- **Backfill:** a ticket whose work is merged into `origin/main` becomes `resolved`, and so does its spec once all its tickets are closed. `wontfix` stays. Anything not merged keeps its status.
- **Where the procedure lives:** a "Resolve a spec ticket" section in `docs/agents/issue-tracker.md`. `triage-labels.md` gains one sentence saying `resolved` is the closing state, not a triage role. The wayfinder section is unchanged.
- **`.prettierignore`:** gains `/.claude/`. The tracked `.claude/skills` files were never formatted by Prettier, so skipping them changes nothing in CI.
- **`npm run check`:** runs `lint`, `format:check`, `test -- --watch=false`, the lint tests and `build` in that order, and stops at the first failure. `checks.yml`'s lint-test-build job replaces its four `run` steps with `npm run check`. The integration job is unchanged.
- **`npm run deps:graph`:** wraps `sheriff export src/main.ts`. The README's command table gains rows for `check` and `deps:graph`.
- **Lint rules:**
  - `.ts`: `@angular-eslint/component-max-inline-declarations` with `{ template: 10 }`.
  - `.html`: `no-restricted-syntax` with `BoundEvent[name="submit"]` and `TextAttribute[name="novalidate"]`, each with a message that points to `CODING_STANDARDS.md` "Signal forms".
  - `.ts` under `src/` (what `ng lint` covers today): a local rule, `local/no-comments-in-function-bodies`, in `lint-rules/`. It allows `eslint-*` directives, `@ts-expect-error`, `@vitest-environment` and `prettier-ignore`. Code that breaks a new rule is fixed the way `AGENTS.md` describes (extract a named function, or write a test), not suppressed.
- **Lint tests:** `lint-rules/*.test.mjs` run with `node --test` as `npm run test:lint`. They use ESLint's `ESLint` API with the repo's `eslint.config.js`: one rejected and one accepted case per custom rule, plus Sheriff cases that cover a dependency-rule violation (a Baseline module importing a Feature) and an encapsulation violation (importing another module's `internal/` file). They live outside `src/`, so `ng test` doesn't pick them up.
- **`CODING_STANDARDS.md`:** holds everything under `AGENTS.md`'s "Code style" heading. A rule that lint now enforces shrinks to one line naming the lint rule, kept so the reviewer knows the reason. The `//TODO human-review this rule & exceptions` marker is removed and the rule kept as written.
- **`AGENTS.md`:** keeps the "Agent skills" pointers and the "Workflow" section. It gains one pointer to `CODING_STANDARDS.md` (read when reviewing or before writing code in an unfamiliar area) and one to `npm run check` and `npm run deps:graph`. References to `AGENTS.md`'s code-style sections elsewhere (e.g. `docs/agents/testing.md`) point to `CODING_STANDARDS.md` instead.

## Testing Decisions

- **Seams:** `npm run test:lint` covers the lint rules and Sheriff boundaries. `npm run check` and CI are the end-to-end seam.
- Good tests here run ESLint on a snippet at a real path in the repo and assert on the rule ID it reports. They don't snapshot whole messages.
- Docs-only tickets (01 and 04) are verified by `npm run format:check` and a grep showing nothing still points at a moved section.
- **Verification, recorded in the PR, not committed:** `npm run check` green; `npm run test:integration` green; `npm run format:check` green with a worktree under `.claude/worktrees/`; `npm run deps:graph` prints JSON.

## Out of Scope

- Linting `scripts/` and `lint-rules/`. `ng lint` covers `src/` only, and widening it is a separate change.
- A pre-commit hook. CI plus `npm run check` cover it without a new dependency.
- An SSH wrapper for git network commands. It's machine-local (`CLAUDE.local.md`), not repo work.
- The architecture skill's Mermaid render check. It lives in the plugin.
- The existing `retro/agent-environment` branch. This spec is independent of it.

## Further Notes

Source: the retro run in the Claude Code session of 22 October 2026, over the sessions from 16 to 21 October.
