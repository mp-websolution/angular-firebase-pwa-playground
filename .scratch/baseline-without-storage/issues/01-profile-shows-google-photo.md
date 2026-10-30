# The profile shows the Google photo; the avatar upload goes

**Spec:** `.scratch/baseline-without-storage/spec.md` (user stories 6–12)

**Blocked by:** none

**Status:** agent-done

## What to build

- `SessionUser` gains `photoUrl: string | null`, mapped from the Auth user's `photoURL` in `AuthSession`. `FakeAuthSession` gains a way to give the signed-in user a photo (e.g. on its Google popup account).
- The profile page shows the session user's `photoUrl` in the existing round image, with `referrerpolicy="no-referrer"`, or the existing grey circle without one. The file input, accepted types, size limit and status messages go.
- `avatarUrl` leaves the profile model, `ProfileData` (`uploadAvatar` and its Storage use), `FakeProfileData`, and the Firestore profile rules (keys `displayName` only).

Leave the Firebase wiring (the `FIREBASE_STORAGE` token), `storage.rules` and its tests, and all docs to tickets 02 and 03.

## Acceptance criteria

The spec's Testing Decisions for `AuthSession`, the profile page, and the Firestore profile rules; the avatar cases in the profile data and component tests go.
