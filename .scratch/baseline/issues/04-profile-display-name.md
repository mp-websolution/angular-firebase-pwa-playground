# 04: Profile display name

**Spec:** `.scratch/baseline/spec.md`

**What to build:** A signed-in end user can open a protected profile page, see their display name and change it. Edits made while offline appear immediately and sync when back online. No user can read or change another user's profile. This ticket establishes the per-user security-rules pattern and the rules-testing setup that later Prototypes copy.

**Blocked by:** 03 (Sign-in with email/password and Google)

**Status:** ready-for-agent

- [ ] A profile service exposes the current user's profile as a signal, plus a command to update the display name
- [ ] Profiles are one document per user, keyed by user ID
- [ ] A protected profile page, reachable from home, lets the user view and edit their display name with validation feedback
- [ ] Firestore rules allow owner-only read and write on profiles, and deny everything else
- [ ] `@firebase/rules-unit-testing` is set up in the integration suite. Rules tests prove owner access is allowed and cross-user and unauthenticated access is denied
- [ ] The seed script creates a profile for the demo user
- [ ] Component tests (seam A, faked profile service) cover viewing, editing and validation
- [ ] Integration tests (seam B) cover reading and updating the profile against the emulator
