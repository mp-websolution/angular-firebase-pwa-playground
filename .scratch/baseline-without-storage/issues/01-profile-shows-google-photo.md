# The profile shows the Google photo; the avatar upload goes

**Spec:** `.scratch/baseline-without-storage/spec.md` (user stories 6–12)

**Blocked by:** none

**Status:** agent-done

## What to build

- `SessionUser` gains `avatarUrl: string | null`, mapped in `AuthSession` from the `photoURL` of the Auth user's Google entry in `providerData`. `FakeAuthSession`'s Google popup account gains a photo, which becomes the signed-in user's avatar.
- The profile page shows the session user's `avatarUrl` in the existing round image, with `referrerpolicy="no-referrer"`, or the existing grey circle without one or when the image fails to load. The file input, accepted types, size limit and status messages go.
- `avatarUrl` leaves the profile model, `ProfileData` (`uploadAvatar` and its Storage use), `FakeProfileData`, and the Firestore profile rules (keys `displayName` only).

Leave the Firebase wiring (the `FIREBASE_STORAGE` token), `storage.rules` and its tests, and all docs to tickets 02 and 03.

## Acceptance criteria

The spec's Testing Decisions for `AuthSession`, the profile page, and the Firestore profile rules; the avatar cases in the profile data and component tests go.

## Comments

- 2026-10-30, PR 66/67 review: `photoUrl` became `avatarUrl`, mapped from the Google provider entry so the avatar follows a changed Google photo (story 7), and a photo that fails to load falls back to the grey circle (story 9).
