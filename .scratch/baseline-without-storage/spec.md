# The Baseline goes without Cloud Storage

**Release:** `baseline-v3.0.0`

**Status:** agent-done

## Problem Statement

A new Project can't run on Firebase's free Spark plan. The Baseline requires Cloud Storage: the profile's avatar upload writes to it, the deploy pushes Storage rules, and the setup steps make you create a bucket. New Storage buckets need the pay-as-you-go Blaze plan. So every Project has to set up billing and a budget alert just to keep the Baseline running, even when none of its Features stores a file.

## Solution

The Baseline no longer uses Cloud Storage at all. A Project's Firebase project needs only Auth and Firestore, so it runs on Spark without billing. The profile page drops the avatar upload. Instead it shows the photo from the user's Google account as their avatar when there is one, and the grey placeholder circle otherwise.

## User Stories

1. As a Project owner, I want to set up a Project's Firebase project without a Storage bucket, so that I can stay on the free Spark plan.
2. As a Project owner, I want the setup steps to skip Storage, Blaze and the budget alert, so that I don't set up billing I don't need.
3. As a Project owner, I want the deploy to push only the Firestore rules, so that it succeeds on a Firebase project without a bucket.
4. As a Project owner, I want the web config to leave out `storageBucket`, so that the config only names what the Baseline uses.
5. As a Project owner, I want pasting the console's full web config, including `storageBucket`, to do no harm, so that I don't have to edit it by hand.
6. As a user signed in with Google, I want my profile page to show my Google account photo as my avatar, so that I can see which account I'm using without uploading anything.
7. As a user signed in with Google, I want my avatar to follow a change to my Google photo the next time I sign in, so that it doesn't keep the photo from my first sign-in.
8. As a user signed in with email and password, I want my profile page to show the grey placeholder circle, so that the page looks the same as it does today without an avatar.
9. As a user whose Google account has no photo, or whose photo fails to load, I want the grey placeholder circle, so that the page never shows a broken image.
10. As a user, I want the profile page without an avatar upload control, so that I'm not offered something that can't work.
11. As a user, I want to keep editing my display name exactly as before, so that the profile still works.
12. As a Project owner, I want the Firestore profile rules to accept only the display name, so that no client can store an avatar URL the Baseline no longer uses.
13. As a developer, I want `npm start` to start only the Auth and Firestore emulators, so that development doesn't depend on a Storage emulator.
14. As a developer, I want the integration tests to run against only the Auth and Firestore emulators, so that the test setup matches what the Baseline uses.
15. As a Feature author, I want the Features docs to describe Firestore rules fragments only, so that I don't write Storage fragments that never deploy.
16. As a Project owner merging `baseline-v3.0.0`, I want an upgrade note listing what I must change, so that my Project keeps building.
17. As a future maintainer, I want the ADRs to name Auth and Firestore as Firebase's only backend services, so that the ADRs match the Baseline.

## Implementation Decisions

- **Storage comes out completely.** No switch, no default, no legacy handling. No Project has been deployed against real Firestore or Storage, so there's nothing to migrate.
- **Firebase wiring:** the Storage injection token, its factory, the Storage SDK import, the Storage emulator connection and the settings model's `storagePort` go, and the TSDoc there stops naming Storage. Auth and Firestore wiring stay as they are.
- **Rules:** the Baseline's Storage rules file goes. Rules assembly handles Firestore only, and a stray `<name>.storage.rules` in a Feature gets no special handling. The Firebase config drops its `storage` rules entry and the Storage emulator port.
- **Deploy:** the rules deploy pushes `firestore:rules` only. Frontend and rules still deploy from the same commit (ADR 0002).
- **Emulators and seeding:** `npm start` and the integration tests start Auth and Firestore only. The seed script stops expecting a Storage emulator host.
- **Environments:** `storageBucket` goes from the placeholder production config and from the development config. The development config's `storagePort` goes too, since the Firebase config no longer has a Storage emulator port to read.
- **`SessionUser`** gains `avatarUrl: string | null`: the `photoURL` of the Auth user's Google entry in `providerData`. Not the user's top-level `photoURL`, which Firebase copies only at the first sign-in; the Google entry updates on every Google sign-in. It's `null` for email/password users and for Google accounts without a photo. Nothing is written to Firestore.
- **Profile model:** the stored `avatarUrl` goes. The profile holds the display name only; the avatar comes from the session user.
- **Profile data:** the avatar upload goes. Updating the display name is unchanged.
- **Firestore profile rules:** the profile's keys are `displayName` only. The `avatarUrl` check goes.
- **Profile page:** it shows the session user's `avatarUrl` in the existing round image, named "Your avatar", with `referrerpolicy="no-referrer"`, because Google photo URLs can answer 403/429 when they get a referrer. Without an `avatarUrl`, or when the image fails to load (offline, since the service worker doesn't cache cross-origin images, or a 403/404/429), it shows the existing grey circle, named "No avatar". The file input, its accepted types, its size limit and its status messages go.
- **Docs:**
  - **Baseline manual:** the Storage setup step goes, along with Blaze and the budget alert, and later steps are renumbered. The emulator and `rules:assemble` rows name only Firestore. The Baseline description drops "with avatar", the note on locations that can't change names only Firestore, and the post-deploy check drops the avatar upload.
  - **Features docs:** fragments are `<name>.firestore.rules` only.
  - **Testing docs:** the Storage rules-test pattern goes.
  - **`CODING_STANDARDS.md`:** the examples taken from the avatar code that goes (`maxAvatarBytes`, `uploadAvatar`, `#storeAvatarWhereOnlyItsOwnerMayWrite`, `#letSameFileBePickedAgain`) are swapped for examples from code that stays.
  - **ADRs:** in ADR 0002, "Auth, Firestore, Storage" becomes "Auth, Firestore". In ADR 0003, "Auth and Storage stay eager" becomes "Auth stays eager". No new ADR.
  - **Deploy workflow:** the rules deploy step's name stops naming Storage.
- **Release:** `baseline-v3.0.0`, a major release, because the `SessionUser` shape changes and Projects must remove any Storage use. Its upgrade note's Project action:
  - Remove any use of the Storage token, `ProfileData.uploadAvatar()`, the profile's `avatarUrl` or `FakeProfileData`'s `avatarUrl` option.
  - Delete any Feature's `<name>.storage.rules`: it is no longer assembled or deployed.
  - Remove `storageBucket` from the environment config (optional).
  - Take the Baseline's `test:integration` script, which starts only the Auth and Firestore emulators.
  - Code that builds a `SessionUser` adds `avatarUrl`.

## Testing Decisions

Good tests here check what a user or a Project sees: what the profile page shows, what the rules accept, and what the assembled rules and the session contain. They don't check how the Baseline wires Firebase internally. Every seam below already exists, so no new seam is needed.

- **`AuthSession` against the Auth emulator** (prior art: the existing `AuthSession` integration tests): a Google user's `avatarUrl` is their Google account's photo, and after they sign in again with a changed photo, the new one. It's `null` for a Google account without a photo and for a plain email/password account.
- **Profile page through `renderApp` with `FakeAuthSession`** (prior art: the existing `EditProfile` component tests): with an avatar, it shows the "Your avatar" image with that URL and no referrer, which pins the reason for `referrerpolicy`. Without one, it shows the "No avatar" circle and no image. When the image fails to load, the circle replaces it. It has no avatar upload control. `FakeAuthSession`'s Google popup account gains a photo, which becomes the signed-in user's avatar.
- **Firestore profile rules against the Firestore emulator** (prior art: the existing profile rules tests): they reject a profile carrying `avatarUrl` and still accept the display-name cases. The avatar URL tests go.
- **Rules assembly script** (prior art: the existing assemble-rules tests): Storage cases go. Firestore assembly stays covered.
- **Removed:** the Storage avatar rules tests, the Storage emulator test in the `provideFirebase` integration tests, the avatar upload cases in the profile data integration tests and component tests, and the avatar support in `FakeProfileData`.

## Out of Scope

- Any other place to keep an avatar, such as an upload to another store or a data URL in Firestore.
- A switch or hook that turns Storage back on in the Baseline.
- How a Project adds Cloud Storage: decided when a Project first needs it.
- A migration for stored `avatarUrl` fields or bucket contents: no Project is deployed.
- Initials or another placeholder in place of the grey circle.

## Further Notes

- Replaces the optional-storage triage ticket "A Project can go without Cloud Storage", which this spec's commit deletes. Its open decisions were settled by grilling on 2026-10-30.
- Nothing else in the Baseline needs Blaze. It has no Cloud Functions, and Google sign-in and the Firestore rules deploy work on Spark.
