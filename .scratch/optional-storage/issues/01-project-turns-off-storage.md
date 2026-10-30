# A Project can go without Cloud Storage

**What to build:** A Project can turn off Cloud Storage. Its Firebase project then runs on the free Spark plan, with no Storage bucket. Without Storage, the Baseline neither uses nor needs it: no avatar upload, no Storage rules deploy, no Storage emulator dependency.

**Blocked by:** none

**Status:** needs-triage

## Why

Cloud Storage for Firebase needs the pay-as-you-go Blaze plan for new buckets (Baseline manual, "2. Firebase project"). Today Storage is required, because:

- the profile's avatar upload writes to it,
- the deploy pushes the Storage rules (`firebase deploy --only firestore:rules,storage`), and fails without a bucket,
- the setup steps make you create a bucket.

A Project that needs nothing from Storage but the avatar must move to Blaze anyway. That means billing set up and a budget alert, just to keep the Baseline running.

## Facts from the code

- `src/app/firebase/provide-firebase.ts`: `FIREBASE_STORAGE` token, `getStorage`, and the emulator connection.
- `src/app/profile/profile-data.ts`: `uploadAvatar` writes `avatars/{uid}` and stores `avatarUrl` on the profile. The edit-profile page offers the upload.
- `firebase.json`: the `storage` rules entry and the Storage emulator port.
- `scripts/assemble-rules.mjs`: assembles `storage.rules` together with Feature fragments (`<name>.storage.rules`).
- `.github/workflows/deploy.yml`: deploys `firestore:rules,storage`.
- `docs/baseline-manual.md`: setup step 2.3 (create the bucket, Blaze, budget alert).

## Open decisions

1. **Where the choice lives:** a Project-owned setting, like `signInMethods` in `src/app-identity/`, or something the deploy reads, or both, since the client and the deploy both need it.
2. **Profile without Storage:** hide the avatar upload and show the placeholder only, or drop avatars entirely.
3. **Deploy:** how the workflow skips the Storage rules (read the same setting, or check for `storage.rules` fragments) and stays one-commit-consistent (ADR 0002).
4. **Features:** what happens when a Feature ships a `<name>.storage.rules` fragment while Storage is off: an assemble error, or a lint/Sheriff rule.
5. **Template default:** Storage on, so a Project that changes nothing behaves as today.
6. **Emulators and tests:** whether the Storage emulator still starts in development, and how the avatar tests run with Storage off.
7. **Release:** which `baseline-v*` release it ships in, and the Project action in the upgrade note.

## Out of scope

- Moving the avatar to another store, such as a data URL in Firestore.
