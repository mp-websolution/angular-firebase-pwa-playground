# 03: Sign-in with email/password and Google

**Spec:** `.scratch/baseline/spec.md`

**What to build:** An end user can sign up and sign in with email and password, or sign in with Google in a popup (ADR 0002: no redirect flow). They can sign out and stay signed in across reloads. The protected home page redirects signed-out users to sign-in and returns them to the originally requested URL afterwards. Signed-in users are sent away from the sign-in page. Locally, a seeded demo user can sign in straight away.

**Blocked by:** 02 (Firebase wiring, emulators and emulator CI job)

**Status:** ready-for-agent

- [ ] An auth session service exposes the current user and an "auth resolved" state as signals, plus commands for email sign-up, email sign-in, Google popup sign-in and sign-out. No SDK types leak to components
- [ ] Public sign-in and sign-up page(s), and a protected home page showing who is signed in
- [ ] A guard that depends only on the auth session service, which preserves the requested URL and redirects back after sign-in
- [ ] Signed-in users visiting sign-in are redirected to home
- [ ] Human-readable error messages for common failures (wrong password, user not found, email in use, weak password, popup closed)
- [ ] The seed script creates a demo email/password user in the Auth emulator
- [ ] Component tests (seam A, faked auth service, rendered through the router) cover sign-up, sign-in, error display, sign-out, the guard redirect with return URL, and the redirect away from sign-in when already signed in
- [ ] Integration tests (seam B) cover email sign-up, sign-in and sign-out against the Auth emulator
- [ ] The Google popup is verified manually against the Auth emulator; how to do this is noted in the ticket's comments when done
