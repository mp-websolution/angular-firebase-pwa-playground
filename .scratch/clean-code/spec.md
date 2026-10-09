# Spec: Names and tests over comments

Status: ready-for-agent

## Problem Statement

The Playground carries a lot of comments: TSDoc on every public member of single-use services, explanations in the middle of function bodies, setup rationale repeated across integration specs, and prose in rules and config files. I follow Uncle Bob's view rather than John Ousterhout's: a comment is a failure to express something in code. The comments make the code longer to read, they drift from what the code does, and they teach agents working in this repo to write still more of them. Every project created from the Template inherits the habit.

## Solution

Refactor the whole Playground (Baseline and the notes Prototype) so that names and tests carry the documentation:

- Explanations move out of function bodies into small, well-named functions. TSDoc on such a function only when its name alone would mislead.
- Function names follow scope: long, descriptive names for private and module-local functions; short names for public API in large scope. Variables follow the inverse (short in a small scope, long in a large one), applied only where code is touched anyway.
- Tests and their names are the documentation of behaviour. A comment that describes behaviour no test pins is replaced by a test.
- TSDoc stays only on generic code used in many places.
- The rule is written down for agents, so the comments don't grow back.

No behaviour changes.

## User Stories

1. As a developer, I want function bodies free of comments, so that I read code, not prose about code.
2. As a developer, I want each non-obvious step extracted into a function whose name says why it exists, so that the reason lives where it can't drift from the code.
3. As a developer, I want private and module-local functions to have long, descriptive names, so that a reader understands a call without opening it.
4. As a developer, I want public API names to stay short, so that the code calling them across the app stays readable.
5. As a developer, I want variables in a small scope to have short names and those in a large scope descriptive ones, so that name length signals how far a name travels.
6. As a developer, I want the test names of a module to read as its specification, so that I learn its behaviour from the test list.
7. As a developer, I want every behaviour a deleted comment described to be pinned by a test, so that removing the comment loses no knowledge.
8. As a developer, I want TSDoc kept on generic code used in many places (the Live data module, the Firebase providers and tokens, the app renderer for tests, the fakes' options, shared test helpers), so that callers see its contract in their editor.
9. As a developer, I want references to ADRs kept only in the TSDoc of the generic piece they constrain, so that decisions stay discoverable without being repeated in every service.
10. As a developer, I want spec files free of comments, so that tests read as plain examples.
11. As a developer, I want test setup shared by the integration specs extracted into helpers with descriptive names, so that the reason for each setup step is stated once.
12. As a developer, I want Firestore and Storage rules to express their checks as named rule functions, so that the rules read like their intent.
13. As a Template user, I want the Prototype section markers in the rules files kept, so that I know what to delete together with a Prototype.
14. As a developer, I want security warnings that no name can carry (e.g. why SVG avatars are refused) kept as a one-line comment, so that nobody loosens the rule unknowingly.
15. As a developer, I want config, workflow and server-config files to keep only comments that give a reason or a warning, with intent moved into step names where the format allows, so that config stays short but safe to change.
16. As a developer, I want HTML templates free of comments whose behaviour a test can pin, so that templates show structure only.
17. As an agent working in this repo, I want the comment and naming rules in AGENTS.md, so that I follow them without being told each time.
18. As a reviewer, I want the rules merged before the refactoring PRs, so that I review each PR against a written standard.
19. As a reviewer, I want the refactoring split by area, each PR green on its own, so that every diff is small enough to review.

## Implementation Decisions

- **Comment rule.**
  - No comments inside function bodies, in any TypeScript or script file.
  - An explanation becomes either a function name, a test name, or TSDoc on an extracted function. Delete it only if it restates the code.
  - Kept as a comment: a warning of consequences that no name or test can carry.
- **TSDoc keeps to generic code.** Feature data-access services (profile, notes, auth session) and components lose their TSDoc. Contract facts they stated, such as auth errors that don't reveal which emails have accounts, or an avatar needing a saved display name, must be pinned by a test; add one test-first where missing.
- **Naming by scope.**
  - Public API names stay as they are. That covers `injectLiveData`, `track` and `ref` on Live data, the `AuthSession` commands, and the service signals. So public interfaces, and therefore the fakes, don't change.
  - Private `#` methods and module-local functions get descriptive names.
- **Shared integration-test setup.** The persistent-cache shim, the slow-emulator wait timeout and similar setup are each extracted once into a testing helper next to the Firebase wiring. Every integration spec uses them.
- **Rules files.**
  - Comments become rule functions (ownership checks, trimmed-text checks, allowed avatar images).
  - The Prototype begin/end markers stay.
  - The SVG security warning stays as a one-liner.
- **Config, workflows, server config.**
  - Comments that restate the config are deleted.
  - Reason and warning comments stay, such as keeping the Angular ignore list in step with the Angular group, or that plain FTP is used knowingly (ADR 0002).
  - In workflows, intent moves into step `name:` fields where possible.
- **HTML.**
  - The update prompt's "always rendered for screen readers" comment and the profile page's rules-dependency comment are replaced by tests.
  - The index page's comment that the theme colour must match the manifest stays: no test is worth it.
- **AGENTS.md** gets a "Comments and naming" section under Code style stating the rules above.
- **Not changed.**
  - `CONTEXT.md` gains no term.
  - No ADR: this is a style choice, cheap to reverse.
  - `docs/agents/testing.md` is updated only where it names helpers or files that move.

## Testing Decisions

- This is a refactor: existing tests are the safety net. Lint, unit tests, integration tests and the production build pass on every PR, and the initial bundle stays under budget (ADR 0003).
- A good test checks external behaviour through the existing seams: component tests render the whole app through the router with faked data-access services (ADR 0004, `docs/agents/testing.md`); integration specs run the real services and rules against the emulators. No new seams.
- Where a deleted comment described behaviour with no test, write the test first, see it pass against current code (it pins existing behaviour), then delete the comment.
- Test names are reviewed as documentation: each reads as a behaviour a user or caller sees. Rename where a name is vague.
- Prior art: `edit-profile.spec.ts` (behaviour-named component tests), `inject-live-data.integration.spec.ts` (shared Live data behaviour), the `*-rules.integration.spec.ts` files.

## Out of Scope

- Any behaviour or public-interface change.
- Markdown docs (README, ADRs, `docs/`), except where a moved file or helper must be renamed in them.
- The open `TODO human-review` note in AGENTS.md about the readability-over-DRY rule.
- Lint rules that try to enforce comment density.

## Further Notes

Ticket order: the AGENTS.md rule first, then the Firebase wiring with the shared test helpers (other integration specs depend on them), then the auth, profile, notes/PWA/app shell areas in any order, and rules/scripts/config/HTML last or in parallel.
