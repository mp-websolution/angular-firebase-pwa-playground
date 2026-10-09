# 03: Auth session, guards and sign-in pages

**Spec:** `.scratch/clean-code/spec.md`

**What to build:**
- Apply the rules to the auth area: auth session, its error and failure types, guards, return URL, the credentials form, the sign-in and sign-up pages, the fake auth session, and their specs.
- The auth session's TSDoc goes. Pin each contract fact it stated with a test first, where none exists:
  - a wrong password and an unknown email fail alike
  - a user going away (sign-out here or in another tab) reloads the page
  - sign-out keeps the user signed in when the cache can't be deleted
  - Google sign-in uses a popup
- Private helpers get descriptive names.
- Keep TSDoc on the fake's constructor options (shared by many specs).

**Blocked by:** 02

**Status:** ready-for-agent

- [x] No comments in function bodies; TSDoc only on the fake's options and any genuinely shared helper
- [ ] Every contract fact from the removed TSDoc is pinned by a named test
- [x] Public interface of `AuthSession` unchanged, so the fake is too
- [x] `npm run lint`, `npm test`, `npm run test:integration`, `npm run build` pass

## Comments

- "Google sign-in uses a popup" is not pinned by a test: Auth's Node build rejects popup and redirect alike (`operation-not-supported`), and `vi.mock('firebase/auth')` breaks the full integration run. The reason stays as a one-line warning above `signInWithGoogle`, as the spec allows for warnings no test can carry.
