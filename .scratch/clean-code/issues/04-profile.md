# 04: Profile data and profile page

**Spec:** `.scratch/clean-code/spec.md`

**What to build:**
- Apply the rules to the profile area: the profile data service and model, the profile page and its template, the fake profile data, and their component, integration and rules specs.
- The service's TSDoc goes. Pin each contract fact it stated with a test first, where none exists:
  - display-name changes work offline and wait to sync
  - an avatar upload needs a connection and rejects when Storage refuses it
  - an avatar needs a saved display name
  - each upload replaces the previous avatar under a new URL
- Remove the template's rules-dependency comment; a test pins that the upload is only offered once a display name is saved.
- Keep TSDoc on the fake's constructor options.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] No comments in function bodies, specs or the profile template
- [ ] Every contract fact from the removed TSDoc and template comment is pinned by a named test
- [ ] Public interface of `ProfileData` unchanged, so the fake is too
- [ ] `npm run lint`, `npm test`, `npm run test:integration`, `npm run build` pass
