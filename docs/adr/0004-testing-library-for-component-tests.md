# Testing Library for component tests

Component tests render the app through the router with Testing Library and drive it with user-event, querying by role, label and text. The official `angular-developer` skill teaches `TestBed.createComponent` with `ComponentFixture`, component harnesses and `RouterTestingHarness` instead. We prefer Testing Library because a test written against what a user sees and does survives refactors of templates, component boundaries and routes, and reads as a description of behaviour. Data-access services are the test seam: component tests replace them with in-memory fakes, so they run fast without emulators.

## Consequences

- `docs/agents/testing.md` overrides the skill's testing references; agents reach it from `AGENTS.md`.
- The vendored skill in `.agents/skills/` stays unedited, so skill updates apply cleanly.
- Every data-access service needs an in-memory fake that behaves like the real SDK closely enough for component tests. The integration suite checks the real services against the emulators.
