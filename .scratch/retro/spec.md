# Spec: Agent environment fixes from the 2026-10-22 retro

Status: ready-for-human

Written after the fact for PR #49 (branch `retro/agent-environment`), from a `/mattpocock-skills:retro` over the last 10 agent sessions in this repo (16 to 21 October 2026: 2× implement-spec, 1 research → spec → implement, 2 code reviews, 4 architecture reviews, 1 rebase, 1 ask-matt).

## Problem Statement

Agents working on the Playground kept paying for things the repo could have told them or checked for them:

- **Closing work was undefined.** In 3 sessions an agent grepped `Status:` lines across `.scratch/` to learn how a ticket gets closed. In 3 more it read old PR bodies (#40, #41, #43) to copy conventions. None of the 29 tickets and specs was ever marked done, and an implementer reported "ticket not marked resolved". The issue tracker defined `resolved` only for wayfinding.
- **Code style rode in every implementer's context.** About 75 of `AGENTS.md`'s 110 lines were code style. Every code review ran `ls CODING_STANDARDS.md`, found nothing, and fell back to reading all of `AGENTS.md`. Several rules were mechanical (comment placement, inline-template length, signal-form markup), so a reviewer had to catch by eye what lint could. A `//TODO human-review` line had settled in as sediment.
- **The local format check was broken.** `npm run format:check` failed with 53 warnings from stale agent worktrees under `.claude/worktrees/`. The rebase session worked around it with `prettier --check $(git ls-files)`.
- **There was no single check command.** Every implementing session strung together lint, format check, unit tests and build by hand, each with its own `tail`.
- **Import graphs were rewritten every time.** 4 architecture sessions hand-wrote throwaway `/tmp` scripts to map module edges, even though Sheriff can export the graph.
- **The import rules were verified by hand.** The Sheriff, encapsulation and Baseline-routes specs each asked for throwaway imports: insert one, run lint, revert. One session got a relative path wrong on the first try. Nothing in CI proved the rules still bite.

## Solution

- Implement skills hand finished work to a human: tickets (and, once complete, their spec) move to `ready-for-human`, and the human decides what happens next and when to merge.
- Code style lives in `CODING_STANDARDS.md`, which the reviewer reads. `AGENTS.md` keeps navigation pointers and the workflow, plus a pointer to the standards sections that override the `angular-developer` skill.
- `npm run lint` enforces the mechanical style rules.
- One command, `npm run check`, runs what CI runs, and CI calls it.
- `npm run deps:graph` prints the module graph.
- A committed lint-rule test suite proves that lint rejects what the import rules and the standards forbid.

## User Stories

1. As an implementer agent finishing a ticket, I want the issue tracker to say how work is closed, so that I don't grep statuses or read old PRs to guess.
2. As an implementer agent, I want to set a finished ticket to `ready-for-human`, so that the human knows it is waiting on them.
3. As an implementer agent finishing the last ticket of a spec, I want to set the spec to `ready-for-human` too, so that the whole spec reads as done.
4. As the human maintainer, I want to decide how to proceed and when to merge, so that agents never merge on their own.
5. As an implementer agent, I want the spec and ticket commits to travel in the implementation PR, so that they reach `main` with the code.
6. As an implementer agent, I want verification results to go in the PR body and not in commits, so that the history stays clean.
7. As an agent writing a ticket or a spec, I want the status-line format stated per file type (`**Status:**` in tickets, `Status:` in specs), so that statuses stay greppable.
8. As a triaging agent, I want `ready-for-human` to also keep its old meaning, "needs a human to implement it", so that triage still has a label for that.
9. As a reviewer agent, I want a `CODING_STANDARDS.md` at the repo root, so that the Standards axis of a code review finds the rules where it looks.
10. As an implementer agent, I want `AGENTS.md` to carry only pointers and the workflow, so that my context holds less always-loaded text.
11. As an implementer agent about to write a signal form, a component template or a new file in a module, I want a pointer to the matching standards section, so that I follow the overrides of the `angular-developer` skill.
12. As a developer, I want lint to reject a comment inside a function body, so that explanations move into names and tests as the standards ask.
13. As a developer, I want lint to allow tool directives (eslint, `@ts-`, `prettier-ignore`, `@vitest-environment`) inside function bodies, so that the comment rule doesn't block tooling.
14. As a developer, I want lint to allow a one-line warning above a declaration, so that the "Keep as comments" exceptions still work.
15. As a developer, I want lint to reject inline templates longer than 10 lines, so that the component-template rule needs no reviewer.
16. As a developer, I want lint to reject `(submit)` handlers and `novalidate` on forms, with a message pointing at the signal-forms standard, so that every signal form keeps the `[formRoot]` shape.
17. As a reviewer, I want the standards to mark which rules lint enforces, so that I spend review attention on the judgement calls.
18. As a developer, I want the existing code to pass the new rules, so that the branch is green on merge.
19. As a developer, I want `npm run format:check` to pass locally while agent worktrees exist under `.claude/`, so that the local check matches CI.
20. As a developer or agent, I want `npm run check` to run lint, the lint-rule tests, the format check, unit tests and the build, so that one command answers "is this PR ready?".
21. As a maintainer, I want CI to run `npm run check`, so that local and CI checks can't drift apart.
22. As an agent opening a PR, I want `AGENTS.md` to say to run `npm run check`, plus `npm run test:integration` when data access or rules change, so that I run the right checks first time.
23. As an architecture-reviewing agent, I want `npm run deps:graph` to list module → module edges, so that I stop writing throwaway import-graph scripts.
24. As an architecture-reviewing agent, I want edges that only specs create to be marked, so that I can tell production coupling from test coupling.
25. As a maintainer, I want CI to prove that a Baseline file importing a Feature, a Feature importing another Feature, production code importing the test helpers, and a Baseline spec importing a Feature's fake all fail lint, so that ADR 0005 can't silently stop biting.
26. As a maintainer, I want CI to prove that importing another module's `internal/` files fails lint (home → auth's return URL helpers and `signedOutGuard`, the app routes → the sign-in page, the Feature route list → the notes page, the test helpers → auth's credentials form, another module's spec → auth's failure model), so that ADR 0006 and ADR 0007 stay enforced.
27. As a maintainer, I want CI to prove that allowed imports still pass (the app routes → a routes file, same-module imports into `internal/`), so that the rules don't tighten by accident.
28. As a spec author, I want future specs to point at the lint-rule tests instead of asking for throwaway imports, so that verification is committed once, not repeated per PR.
29. As a developer, I want the README's command table and file table to list `check`, `test:lint`, `deps:graph` and `CODING_STANDARDS.md`, so that humans find them too.
30. As a developer, I want stale, clean agent worktrees removed with their branches kept, so that `.claude/worktrees/` holds only live work.

## Implementation Decisions

- **Closing work:** the issue-tracker doc gains a "When a skill says to close work" section, worded to match the phrase `/implement-spec` uses ("the way the issue tracker closes work"). It covers `/implement` and `/implement-spec`: set `ready-for-human`, commit that on the implementation branch, open the PR with the spec and ticket commits, and put verification in the PR body. Agents never merge.
- **`ready-for-human` meaning:** the triage-label table widens the role to "implemented by an agent, or needs a human to implement it; a human decides what happens next and when to merge". No new label string.
- **Status format:** documented per file type. Existing files are not rewritten, and tickets finished before this spec keep `ready-for-agent`.
- **Standards split:** the whole Code style section moves verbatim into `CODING_STANDARDS.md` (headings one level up), minus the TODO line, with lint-enforced rules marked. `AGENTS.md` keeps the agent-skills pointers, a one-paragraph Code style pointer, and the workflow. The testing guide's cross-reference to "Comments and naming" now points at the standards.
- **Lint rules:**
  - A local ESLint rule, "no comments in function bodies", for every TypeScript file lint covers. It reports any comment inside the body of a function, method or arrow function, except tool directives.
  - Angular ESLint's inline-declarations limit, set to 10 template lines.
  - `no-restricted-syntax` on templates for a bound `submit` event and a `novalidate` attribute, each with a message naming the signal-forms standard.
  - The one existing violation, a comment in the Firebase wiring's app factory, became a named function that lets the next injector initialise the default app again.
- **Check command:** `npm run check` runs lint, then the lint-rule tests, then the format check, then the unit tests in single-run mode, then the build. CI's lint-test-build job replaces its four steps with this one. Integration tests stay a separate CI job and command.
- **Prettier:** `.claude/` joins the ignore list next to `.scratch/`.
- **Module graph:** `npm run deps:graph` uses Sheriff's project-data API, entering from the app's main file and from every tracked spec. It folds file imports into edges between Sheriff tags, prints each edge with its file count, and marks edges that only specs create. No new dependency.
- **Lint-rule tests:** run on Node's built-in test runner via `npm run test:lint`, outside the Angular unit-test builder, because the ESLint API doesn't belong in a browser-style bundle.
- **No pre-commit hook** for now.
- **Housekeeping:** five clean worktrees (features spec and integration, Sheriff integration and research, test-coverage research) were removed; their branches remain.

## Testing Decisions

- **Seam: the repo's own lint config**, driven through ESLint's API with fixture source text linted under a real file path (`lintText` with `filePath`). It is the same seam as `npm run lint`, so the tests assert what the repo forbids and allows, not how a rule computes it.
- **What a good test asserts here:** which rule fires (its rule id), never message text or lint-output snapshots. This keeps the Sheriff and encapsulation specs' point, that tests must not pin Sheriff's internals, while replacing their per-PR throwaway imports with committed cases.
- **Cases:** the 4 dependency-rule violations from the Sheriff spec, the 6 encapsulation violations from the encapsulation and Baseline-routes specs, 3 allowed imports, the comment rule with and without its exceptions, inline templates at 11 and 8 lines, and `(submit)` and `novalidate`.
- **Test names** describe the rule's effect ("fails lint for a Feature importing another Feature"), in the spirit of the testing guide.
- **Red check (verification, not committed):** switching off the comment rule, raising the template limit and renaming the `submit` selector turned exactly those 3 tests red (16 pass, 3 fail).
- **Verification for PR #49:** `npm run check` exit 0 (lint clean, 19/19 lint-rule tests, Prettier clean, 91/91 unit tests, build OK) and `npm run test:integration` 88/88.
- **Prior art:** none in the repo for lint tests. The throwaway-import lists in the Sheriff, encapsulation and Baseline-routes specs supplied the cases.

## Out of Scope

- A pre-commit hook (lint-staged, Husky or similar).
- A wrapper for the per-command SSH setup that git network commands need on this machine (retro finding, low).
- How the architecture-review skill checks Mermaid rendering: it serves a temporary HTTP server because the browser pane can't open local files (retro finding; it belongs to the plugin, not the repo).
- Rewriting existing tickets' statuses or unifying the two status-line formats.
- Linting `scripts/` and `lint-rules/` themselves (lint covers `src/` only).
- Revisiting "PR #2 is the model for the description" against the `/pr` skill's template.

## Further Notes

- The retro's source data were the session transcripts under `~/.claude/projects/` for this checkout, including subagent transcripts. They are machine-local and not committed.
- The retro ranked its findings by severity. This spec implements findings 1–6, in that order of severity; findings 7 and 8 are listed under Out of Scope.
- Future specs that change import rules or style rules should add cases to the lint-rule suite instead of listing throwaway imports under verification.
