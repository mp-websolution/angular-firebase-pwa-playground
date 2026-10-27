# A Project picks its sign-in methods

**Release:** `baseline-v2.0.0`, shared with `.scratch/feature-start-page/` and `.scratch/public-live-data/`

**What to build:** A new Project-owned file, `src/app-identity/sign-in-methods.ts`, lists the sign-in methods the Baseline offers: `'password'`, `'google'` or both. `/sign-in` shows only the listed methods. `/sign-up` exists only when `'password'` is listed.

**Blocked by:** none

**Status:** agent-done

## Why

The first Project, `tango-calendar-pwa`, has an anonymous public Calendar and a signed-in Admin section for a hand-picked group of Editors and Admins. Its rules match roles by `request.auth.token.email` and require `email_verified == true`. So it wants Google only, with no passwords and no public sign-up (its ADR 0002). Today the Baseline's sign-in and sign-up pages always offer email/password and link to `/sign-up`, and the Project can't change them.

## Decisions (grilling, 2026-10-27)

1. **Where the choice lives:** `src/app-identity/sign-in-methods.ts` exports `signInMethods`. `src/app-identity/**` is already Project-owned, so the drift check's groups don't change.
   - **Type:** a non-empty tuple of `SignInMethod = 'password' | 'google'`, so the list can't be empty.
   - **Order:** the list order is the order on the page.
2. **No email link:** dropped. Only the 2 existing methods remain, and `AuthSession` gets no new method.
3. **No sign-up flag:** "sign-up" means only the password `/sign-up` page. It is routed and linked only when `'password'` is listed. Google still creates an account on first sign-in, and Firebase has no plain toggle against that. Such an account gets no rights, because authorization stays in the Project's rules and roles.
4. **Template default:** `['password', 'google']`, which is today's behaviour, so a Project that keeps it needs no console change.
5. **How pages and routes read the list:**
   - A `SIGN_IN_METHODS` injection token defaults, through a root factory, to `signInMethods`.
   - `/sign-in` shows the credentials form only with `'password'` and the Google button only with `'google'`, in list order. The "Create one" link to `/sign-up` only shows with `'password'`.
   - `/sign-up` stays in `authRoutes` (ADR 0007), with a `canMatch` that reads the token. Without `'password'`, the route doesn't match, so `**` sends it to `/`.
   - Tests override the token, so they need no module mocking.
6. **`SessionUser`:** unchanged, with no `emailVerified`. Rules read `request.auth.token.email_verified` directly, and the Baseline sends no verification mails.
7. **Auth destinations:** every one is `/`, and sign-out lives on the profile page (settled in `.scratch/feature-start-page/`, decisions 3 and 5).
8. **ADR and glossary:** none.

## Tests

- **Sign-in page:** component tests run with `['password', 'google']`, `['google']` and `['password']`. They check which controls and links show, and in what order.
- **Routes:** a route test checks that `/sign-up` → `/` without `'password'`.
- **`AuthSession`:** the integration tests stay unchanged, since the methods themselves don't change.

## Docs

- **Baseline manual:** a setup step that does the following:
  - Turn on exactly the providers in `signInMethods` in the Firebase console, with Email/Password off if `'password'` isn't listed.
  - Add the deploy domain (ADR 0002) to Auth's authorized domains.
  - Note that the emulator's Google sign-in uses its fake account picker. There's no runtime check against the console.
- **File groups:** in `scripts/baseline-config.json` and the file groups table in `docs/upgrade-notes.md`, the `src/app-identity/**` description becomes "The app identity and sign-in methods".
- **Release entry** (`baseline-v2.0.0`, see `.scratch/feature-start-page/` decision 9):
  - **Sentence:** A Project picks its sign-in methods; `/sign-up` exists only with passwords.
  - **Project action:** New Project-owned `src/app-identity/sign-in-methods.ts`: keep `['password', 'google']` or set your own, and match the console's providers.

## Acceptance

- [ ] `src/app-identity/sign-in-methods.ts` and the `SIGN_IN_METHODS` token, written test-first
- [ ] `/sign-in` shows the listed methods in list order. `/sign-up` has `canMatch`.
- [ ] Sign-in component tests for the 3 lists, and the `/sign-up` route test
- [ ] Manual setup step, file-group descriptions, and the release entry
- [ ] `npm run lint`, `npm test`, `npm run test:integration` and `npm run build` pass

## Out of scope

- Email link (passwordless) sign-in.
- Roles and authorization. The Project keeps them in its own Firestore documents and rules.
- Shared and public Live data: `.scratch/public-live-data/`.
