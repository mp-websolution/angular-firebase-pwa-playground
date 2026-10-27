# How a Project picks its sign-in methods

Type: grilling

## Question

How does a Project choose which sign-in methods the Baseline offers: email/password, Google, and a new email link (passwordless) method? And how does it turn off public sign-up, all without Baseline drift?

## Why

The first Project, `tango-calendar-pwa`, has an anonymous public Calendar and a signed-in Admin section for a hand-picked group of Editors and Admins. Its rules match roles by `request.auth.token.email` and require `email_verified == true`. So it wants Google and email link only, both of which give a verified email, and no passwords and no public sign-up (its ADR 0002). The Baseline's sign-in and sign-up pages always offer email/password and link to `/sign-up`, and the Project can't change them.

## Facts

- `AuthSession` (`src/app/auth/auth-session.ts`) has `signUpWithEmail`, `signInWithEmail` (email/password) and `signInWithGoogle` (popup). It has no email link method.
- `/sign-in` shows the credentials form, a "Sign in with Google" button and a "Create one" link to `/sign-up`. `/sign-up` shows the credentials form. Both use `signedOutGuard`, and `authRoutes` declares both (ADR 0007).
- `signedInGuard` redirects to `/sign-in` with a `returnUrl`. `injectReturnUrl()` defaults to `/`.
- `SessionUser` is `{ uid, email, displayName }`, with no `emailVerified`.
- Email link sign-in needs an action URL the app handles (a completion route), the email kept on the device between sending and returning (or asked for again on another device), and the provider turned on in the Firebase console. Firebase's authorized domains apply.
- The Project-owned files a Project may edit are listed in `scripts/baseline-config.json` (e.g. `src/app-identity/**`, `src/environments/environment.ts`).

## Decisions to settle

- Where the choice lives: a Project-owned file (e.g. in `src/app-identity/` or the environment) or something else. Its shape (a list of methods plus a sign-up flag?) and the Template's default (today's behaviour).
- Email link in the Baseline: the completion route and its path, the email storage across the round trip, the cross-device case, errors (expired or used link), and how the return URL survives the email.
- Sign-up when it is off: is `/sign-up` not routed at all, or does it redirect? What happens to the "Create one" link, and to an email link or Google sign-in for an unknown user (both create accounts)?
- Whether `SessionUser` exposes `emailVerified`.
- What a Project still has to do in the Firebase console (providers on or off, authorized domains), and whether the Baseline manual says so.
- Tests (auth pages, guards, the `AuthSession` integration tests against the Auth emulator, which supports email link). Release type and its upgrade note.

## Related

- `.scratch/feature-start-page/` and `.scratch/public-live-data/` (the same Project).
- Out of scope: roles and authorization. The Project keeps them in its own Firestore documents and rules.
