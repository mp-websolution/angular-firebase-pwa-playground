# 05: Notes Prototype, PWA update prompt and app shell

**Spec:** `.scratch/clean-code/spec.md`

**What to build:**
- Apply the rules to:
  - the notes Prototype: data service, model, page, routes, fake and specs
  - the PWA update prompt and its fake
  - the app shell: app, routes, Prototype routes, config, home page, page reload, environments, main and test setup
  - the app renderer for tests
- The renderer's options are generic, so their TSDoc stays.
- The notes data service's TSDoc goes, with its contract facts pinned by tests.
- Remove the update prompt template's "always rendered so screen readers announce it" comment, after a test pins that the prompt is announced (its live region is present before a new version arrives).
- The Prototype routes' instructions for Template users may stay only as TSDoc on the shared routes constant. Keep the guidance in `docs/prototypes.md` in step.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] No comments in function bodies, specs or these templates
- [ ] Contract facts from removed TSDoc and template comments pinned by named tests
- [ ] Public interfaces of `NotesData` and the renderer unchanged
- [ ] Deleting the notes Prototype still leaves the Baseline intact (`docs/prototypes.md`)
- [ ] `npm run lint`, `npm test`, `npm run test:integration`, `npm run build` pass
