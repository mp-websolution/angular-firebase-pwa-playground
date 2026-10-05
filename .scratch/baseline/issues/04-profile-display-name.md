# 04: Profile display name

**Spec:** `.scratch/baseline/spec.md`

**What to build:** A signed-in end user can open a protected profile page, see their display name and change it. Edits made while offline appear immediately and sync when back online. No user can read or change another user's profile. This ticket establishes the per-user security-rules pattern and the rules-testing setup that later Prototypes copy.

**Blocked by:** 03 (Sign-in with email/password and Google)

**Status:** ready-for-agent

- [x] Prerequisite, moved from ticket 03 since this ticket adds the first Firestore page: `signOutAndClearCache` shuts Firestore down before it clears the cache. If clearing ever fails, the user stays signed in, but this tab's Firestore stays shut down until the next reload, and the `FIRESTORE` loader keeps returning that instance, so the profile page would break. This can't happen with today's SDK (ticket 03, "Finding: other tabs don't block sign-out"). Check that this still holds for the SDK version in use; if it doesn't, have the loader drop its cached instance after a terminate
- [x] A profile service exposes the current user's profile as a signal, plus a command to update the display name
- [x] Profiles are one document per user, keyed by user ID
- [x] A protected profile page, reachable from home, lets the user view and edit their display name with validation feedback
- [x] The profile page is a lazy-loaded route, and the profile service and anything else that imports values from `firebase/firestore` are only reachable from it. The service gets Firestore with `await inject(FIRESTORE)()`. The production build stays within the initial bundle budget
- [x] Firestore rules allow owner-only read and write on profiles, and deny everything else
- [x] `@firebase/rules-unit-testing` is set up in the integration suite. Rules tests prove owner access is allowed and cross-user and unauthenticated access is denied
- [x] The seed script creates a profile for the demo user
- [x] Component tests (seam A, faked profile service) cover viewing, editing and validation
- [x] Integration tests (seam B) cover reading and updating the profile against the emulator

## Comments

### Implementation notes

- Prerequisite checked: the installed `firebase` is still 12.19.0, the version ticket 03 checked ("Finding: other tabs don't block sign-out"), so clearing the cache can't fail with `failed-precondition` and the loader needs no change. Re-check when `firebase` is updated.
- `ProfileData` (`src/app/profile/profile-data.ts`) exposes `profile` (`undefined` until loaded), `waitingToSync` and `loadFailed` signals and the command `updateDisplayName`. It listens to `profiles/{uid}` with metadata changes. `waitingToSync` is `hasPendingWrites && fromCache`: online, every write is pending for a moment until the server acknowledges it, and only `fromCache` says the listener has lost the server. So the offline message never flashes on an online save.
- Offline: `updateDisplayName` doesn't wait for the server, because Firestore's write promise only settles once back online. The listener shows the change straight away and the page says it's saved on this device until it syncs. Not covered: if the server ever rejects a save, the user isn't told (the error only reaches `ErrorHandler`). A rejected write is reported to Angular's `ErrorHandler`; Firestore has already undone it locally.
- Sign-out (here or in another tab) shuts Firestore down, which ends the listener with `aborted`. That isn't shown as a load failure, since the page reloads anyway. Found in the browser and covered by an integration test.
- `EditProfile` (`src/app/profile/edit-profile/`) is lazy-loaded at `/profile` behind `signedInGuard` and linked from home. The production build keeps Firestore in a lazy chunk: initial total 438 kB.
- The display name is saved trimmed and must be 2 to 50 characters. `[formField]` sets the input's `maxlength`, so typing stops at 50. The rules check the same: a string with no surrounding spaces, 2 to 50 characters, and no other fields. Ticket 05 adds the avatar field to `isValidProfile`.
- The form follows the stored name (after loading, or a change in another tab) but keeps an unsaved draft. `linkedSignal` re-runs on every profile emission, including metadata-only snapshots, so without this a draft got wiped whenever the connection changed.
- Rules tests live in `src/app/profile/profile-rules.integration.spec.ts`; `docs/agents/testing.md` describes the pattern for later Prototypes.
- Component tests: `renderApp(url, session, { profile })` with `FakeProfileData` (`src/app/profile/testing/`), options `displayName`, `offline` and `loadFails`.
- Seed: `scripts/seed/02-demo-profile.mjs` gives the demo user the display name "Demo User".
