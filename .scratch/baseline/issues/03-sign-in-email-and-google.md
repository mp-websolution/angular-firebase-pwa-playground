# 03: Sign-in with email/password and Google

**Spec:** `.scratch/baseline/spec.md`

**What to build:** An end user can sign up and sign in with email and password, or sign in with Google in a popup (ADR 0002: no redirect flow). They can sign out and stay signed in across reloads. The protected home page redirects signed-out users to sign-in and returns them to the originally requested URL afterwards. Signed-in users are sent away from the sign-in page. Locally, a seeded demo user can sign in straight away.

**Blocked by:** 02 (Firebase wiring, emulators and emulator CI job)

**Status:** ready-for-agent

- [x] An auth session service exposes the current user and an "auth resolved" state as signals, plus commands for email sign-up, email sign-in, Google popup sign-in and sign-out. No SDK types leak to components
- [x] Sign-out goes through `signOutAndClearCache(auth, loadFirestore)` (then reloads the page), so the next person on the device cannot read the previous user's cached documents. The auth session service injects the `FIRESTORE` loader but never calls it at startup, so Firestore stays out of the initial load; sign-out loads it if needed
- [x] When clearing the cache fails because another tab has the app open (`failed-precondition`), the user stays signed in and is asked to close their other tabs and try again
- [x] Public sign-in and sign-up page(s), and a protected home page showing who is signed in
- [x] A guard that depends only on the auth session service, which preserves the requested URL and redirects back after sign-in
- [x] Signed-in users visiting sign-in are redirected to home
- [x] Human-readable error messages for common failures (wrong password, user not found, email in use, weak password, popup closed)
- [x] The seed script creates a demo email/password user in the Auth emulator
- [x] Component tests (seam A, faked auth service, rendered through the router) cover sign-up, sign-in, error display, sign-out, the guard redirect with return URL, and the redirect away from sign-in when already signed in
- [x] Integration tests (seam B) cover email sign-up, sign-in and sign-out against the Auth emulator
- [x] The Google popup is verified manually against the Auth emulator; how to do this is noted in the ticket's comments when done

## Comments

### Implementation notes

- `AuthSession` (`src/app/auth/auth-session.ts`) exposes `user` and `resolved` signals and the commands `signUpWithEmail`, `signInWithEmail`, `signInWithGoogle`, `signOut`. Commands reject with `AuthSessionError`, whose `reason` is the app's own failure code and whose `message` is ready to show.
- Component tests replace it with `FakeAuthSession` (`src/app/auth/testing/`), an in-memory stand-in with accounts, a scripted Google popup, a delayed session restore and a failing sign-out. `renderApp()` (`src/app/testing/`) renders the whole app through the router with it.
- The guards wait for `resolved` before deciding, so a reload restores the session instead of bouncing to sign-in. `signedInGuard` adds `?returnUrl=` (left out for home); sign-in and sign-up follow it, and the links between them keep it.
- Page reloads go through the `RELOAD_PAGE` token (`src/app/browser/reload-page.ts`) so the integration tests can replace them. Ticket 06's update prompt can reuse it.
- Seeded demo user: `demo@example.com` / `demo-password`, uid `demo-user` (`scripts/seed/01-demo-user.mjs`), so ticket 04 can seed its profile under a known uid.

### Finding: other tabs don't block sign-out

Checked in the Firebase 12.19 SDK source and in a real browser (two tabs, both with Firestore's IndexedDB cache open): when one tab deletes the cache, Firestore in every other tab gets a `versionchange` event and shuts itself down, so `clearIndexedDbPersistence` succeeds and does not fail with `failed-precondition`. The `other-tabs-open` handling is still there, as the ticket asks, but it is defensive. The `signOutAndClearCache` docstring has been corrected.

The real gap was the other tabs: they stayed on the protected page, signed out, with Firestore shut down. `AuthSession` now reloads the page whenever the signed-in user goes away, whether they signed out in this tab or another one. So every tab ends up on sign-in, with a fresh Firestore. This is covered by an integration test and was checked in the browser.

Known limitation, from the review: `signOutAndClearCache` shuts Firestore down before it clears the cache. If clearing ever fails, the user stays signed in, but this tab's Firestore stays shut down until the next reload, and the `FIRESTORE` loader keeps returning that instance. This can't happen with today's SDK. If it ever starts happening, have the loader drop its cached instance after a terminate.

### Manual check: Google popup against the Auth emulator

Verified by the user in a normal browser on 2026-10-05. The agent's built-in browser can't do this check: it opens popups in the same tab, so the emulator's widget has no opener to report back to ("No matching frame"). Steps:

1. `npm start` and open http://localhost:4200/sign-in.
2. Click "Sign in with Google". A popup opens the Auth emulator's "Sign-in with Google.com" widget.
3. Click "Add new account", then "Auto-generate user information", then "Sign in with Google.com".
4. Expect the popup to close and the app to show home with "Signed in as <generated email>". The user also shows up in the Emulator UI (http://localhost:4000/auth) with the Google provider.
5. Sign out, click "Sign in with Google" again and close the popup. Expect "The Google sign-in window was closed before you finished."

